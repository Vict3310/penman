/**
 * Import car listings from the Binaryy/cars-for-sale dataset into the existing
 * cars-for-sale catalogue.
 *
 *   npm run cars:import -- --dry-run          # report only, writes no products
 *   npm run cars:import -- --limit 12         # a small first batch
 *   npm run cars:import                       # every record, images stored
 *   npm run cars:import -- --publish          # publish instead of holding drafts
 *
 * ── Where the data goes ─────────────────────────────────────────────────
 * The cars-for-sale catalogue in this application is `public.products` (that is
 * what /shop/cars and /autos/cars read), so imported cars are written there,
 * under a "cars" product category. Nothing is written to `vehicles`, which is
 * the rental fleet: the dataset is a for-sale listing set with mileage and
 * condition and nothing about hire terms or availability, so treating it as
 * rental inventory would state things the data does not say.
 *
 * ── What it will never do ───────────────────────────────────────────────
 *   * It never deletes anything, and never resets or wipes a table.
 *   * It only ever writes rows whose `inventory_source` is this dataset. Every
 *     hand-curated listing has a null `inventory_source` and is invisible to
 *     the update path by construction.
 *   * It does not overwrite a row a human has since edited. Each imported row
 *     records a hash of exactly what the importer wrote; if the row no longer
 *     matches that hash, it is left alone and counted as `locally_modified`.
 *   * It publishes nothing unless asked (`--publish`). The default is `draft`,
 *     so imported listings cannot appear in the catalogue before someone has
 *     looked at them.
 *
 * ── Images ──────────────────────────────────────────────────────────────
 * Default (`--images=embedded`) uses the JPEG bytes the dataset ships with, so
 * no third-party host is contacted at all. `--images=url` fetches the source
 * URL instead (see the notes in the README section of the run summary).
 * Either way the bytes are validated, size-capped and re-uploaded into this
 * project's existing Supabase Storage bucket ("media"), which is where every
 * other image in the application lives.
 *
 * Environment required: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";
import { asyncBufferFromFile, asyncBufferFromUrl, parquetMetadataAsync, parquetReadObjects } from "hyparquet";

import { resolveSslConfig } from "./database-ssl.mjs";
import {
  DATASET_SOURCE,
  DATASET_URL,
  IMPORT_CATEGORY,
  currentRowHash,
  describe as describeRecord,
  importHashOf,
  mapRow,
} from "./lib/cars-import.mjs";

/* ── Arguments ─────────────────────────────────────────────────────────── */

const USAGE = `
Import cars from the Hugging Face dataset ${DATASET_SOURCE}.

  npm run cars:import -- [options]

Options
  --dry-run            Report what would happen. Writes no products at all.
  --limit <n>          Process only the first n records of the dataset.
  --images <mode>      embedded (default) | url | none
  --publish            End up 'published', including rows already imported.
                       Default is 'draft', which holds everything for review.
  --only-missing       Skip records that already exist (implies no updates).
  --dataset <path|url> Use a local parquet file or another URL.
  --refresh            Re-download the parquet even if it is cached.
  --no-record          Do not write the run summary to inventory_imports.
  --batch <n>          Rows per transaction (default 200).
  --quiet              Only print the final summary.
  --help               This text.
`;

function parseArgs(argv) {
  const options = {
    dryRun: false,
    limit: null,
    images: "embedded",
    publish: false,
    onlyMissing: false,
    datasetUrl: DATASET_URL,
    refresh: false,
    record: true,
    batch: 200,
    quiet: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (value === undefined) throw new Error(`${arg} needs a value`);
      i += 1;
      return value;
    };

    switch (arg) {
      case "--dry-run": options.dryRun = true; break;
      case "--limit": options.limit = Number.parseInt(next(), 10); break;
      case "--images": options.images = next(); break;
      case "--publish": options.publish = true; break;
      case "--only-missing": options.onlyMissing = true; break;
      case "--dataset": options.datasetUrl = next(); break;
      case "--refresh": options.refresh = true; break;
      case "--no-record": options.record = false; break;
      case "--batch": options.batch = Number.parseInt(next(), 10); break;
      case "--quiet": options.quiet = true; break;
      case "--help": case "-h": options.help = true; break;
      default: throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!["embedded", "url", "none"].includes(options.images)) {
    throw new Error(`--images must be embedded, url or none (got ${options.images})`);
  }
  if (options.limit !== null && (!Number.isInteger(options.limit) || options.limit <= 0)) {
    throw new Error("--limit must be a positive integer");
  }
  if (!Number.isInteger(options.batch) || options.batch <= 0) {
    throw new Error("--batch must be a positive integer");
  }

  return options;
}

/* ── Environment, database, storage ────────────────────────────────────── */

function readEnvLocal() {
  const filePath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(filePath)) return {};

  const result = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = line.slice(0, equalsIndex).trim();
    result[key] = line.slice(equalsIndex + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return result;
}

const env = { ...readEnvLocal(), ...process.env };
const log = (...args) => { if (!options.quiet) console.log(...args); };
const options = parseArgs(process.argv.slice(2));

if (options.help) {
  console.log(USAGE);
  process.exit(0);
}

const CACHE_DIR = path.resolve(process.cwd(), ".cache", "cars-import");
const PARQUET_PATH = path.join(CACHE_DIR, "cars-for-sale.parquet");
const IMAGE_CACHE_PATH = path.join(CACHE_DIR, "images.json");
const LOG_DIR = path.join(CACHE_DIR, "logs");

/* ── Argument for the run ──────────────────────────────────────────────── */

async function ensureDataset() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  // A local path is used as-is: this is what makes an offline or test import
  // possible (and what the maintainer uses to rehearse a source update).
  if (!/^https?:\/\//i.test(options.datasetUrl)) {
    const localPath = path.resolve(process.cwd(), options.datasetUrl);
    if (!fs.existsSync(localPath)) throw new Error(`Dataset file not found: ${localPath}`);
    const bytes = fs.readFileSync(localPath);
    const sha = crypto.createHash("sha256").update(bytes).digest("hex");
    log(`• dataset: local file ${path.relative(process.cwd(), localPath)} (${bytes.length} bytes)`);
    return { path: localPath, bytes: bytes.length, revision: `sha256:${sha.slice(0, 16)}` };
  }

  if (fs.existsSync(PARQUET_PATH) && !options.refresh) {
    const stats = fs.statSync(PARQUET_PATH);
    const sha = crypto.createHash("sha256").update(fs.readFileSync(PARQUET_PATH)).digest("hex");
    log(`• dataset: cached ${path.relative(process.cwd(), PARQUET_PATH)} (${stats.size} bytes)`);
    return { path: PARQUET_PATH, bytes: stats.size, revision: `sha256:${sha.slice(0, 16)}` };
  }

  log(`• dataset: downloading ${options.datasetUrl}`);
  const response = await fetch(options.datasetUrl, {
    headers: { "user-agent": "PenmanEmpireCarsImport/1.0 (+https://penmanempire.com)" },
  });
  if (!response.ok) throw new Error(`Dataset download failed: HTTP ${response.status}`);

  const bytes = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(PARQUET_PATH, bytes);
  const sha = crypto.createHash("sha256").update(bytes).digest("hex");
  const revision = response.headers.get("etag")?.replace(/"/g, "") ?? `sha256:${sha.slice(0, 16)}`;
  return { path: PARQUET_PATH, bytes: bytes.length, revision };
}

/**
 * The image bytes the dataset ships, or null.
 *
 * hyparquet decodes BYTE_ARRAY as UTF-8, which replaces the invalid sequences
 * inside a JPEG with U+FFFD — a lossy read. Asking for raw bytes and decoding
 * the text columns explicitly (see lib/cars-import.mjs) keeps them byte-exact;
 * that is verified against a pyarrow read in tests/cars-import.test.ts.
 */
const IMAGE_MAGIC = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
  { mime: "image/avif", bytes: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70] },
];

/** Sniffs the real type from the bytes. The extension and the header are not trusted. */
function sniffImage(buffer) {
  for (const { mime, bytes } of IMAGE_MAGIC) {
    if (buffer.length >= bytes.length && bytes.every((b, i) => buffer[i] === b)) return mime;
  }
  // RIFF containers are shared with WAV/AVI; the four bytes at 8..12 disambiguate.
  if (buffer.length > 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }
  return null;
}

const MIME_EXTENSION = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // mirrors the bucket's file_size_limit
const DOWNLOAD_TIMEOUT_MS = 15_000;
const DOWNLOAD_RETRIES = 2;

function readImageCache() {
  try {
    return JSON.parse(fs.readFileSync(IMAGE_CACHE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function writeImageCache(cache) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(IMAGE_CACHE_PATH, JSON.stringify(cache, null, 2));
}

/**
 * Fetches one source image.
 *
 * Validates the response and the bytes, caps the size, times out, and retries a
 * bounded number of times. A 403 is treated as a permanent refusal rather than
 * retried: that host answers 403 for a listing that no longer exists, and it is
 * also what a hotlink protection would say — neither should be hammered.
 */
async function fetchSourceImage(url) {
  let lastError = "unknown";

  for (let attempt = 0; attempt <= DOWNLOAD_RETRIES; attempt += 1) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 500 * attempt));

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
        headers: { "user-agent": "PenmanEmpireCarsImport/1.0 (+https://penmanempire.com)" },
      });

      if (response.status === 403 || response.status === 404 || response.status === 410) {
        return { ok: false, reason: `http_${response.status}` };
      }
      if (response.status === 429 || response.status >= 500) {
        lastError = `http_${response.status}`;
        continue;
      }
      if (!response.ok) return { ok: false, reason: `http_${response.status}` };

      const declared = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      if (declared && !declared.startsWith("image/")) return { ok: false, reason: `not_an_image:${declared}` };

      const declaredLength = Number.parseInt(response.headers.get("content-length") ?? "", 10);
      if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) {
        return { ok: false, reason: "too_large" };
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length === 0) return { ok: false, reason: "empty_body" };
      if (bytes.length > MAX_IMAGE_BYTES) return { ok: false, reason: "too_large" };

      const mime = sniffImage(bytes);
      if (!mime) return { ok: false, reason: "unrecognised_image_bytes" };

      return { ok: true, bytes, mime };
    } catch (error) {
      lastError = error.name === "TimeoutError" ? "timeout" : `fetch_failed:${error.code ?? error.name}`;
    }
  }

  return { ok: false, reason: lastError };
}

/**
 * Puts one image in the project's existing storage bucket and returns a
 * MediaRef, or a reason it could not be stored.
 *
 * The object name contains the content hash, so the same picture is never
 * uploaded twice: a second attempt collides with the existing object, which is
 * counted as a reuse rather than an error.
 */
async function storeImage(supabase, { slug, bytes, mime, cache }) {
  const hash = crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 32);
  const cacheKey = `${hash}`;
  if (cache[cacheKey]) return { ok: true, reused: true, ref: cache[cacheKey] };

  const objectPath = `${IMPORT_CATEGORY.slug}/${slug}/${hash}.${MIME_EXTENSION[mime]}`;
  const { error } = await supabase.storage
    .from("media")
    .upload(objectPath, bytes, { contentType: mime, cacheControl: "31536000", upsert: false });

  const alreadyThere = Boolean(error) && /already exists|duplicate/i.test(error.message ?? "");
  if (error && !alreadyThere) return { ok: false, reason: `upload_failed:${error.message}` };

  const { data } = supabase.storage.from("media").getPublicUrl(objectPath);
  const ref = { path: objectPath, url: data.publicUrl, alt: "" };
  cache[cacheKey] = ref;
  return { ok: true, reused: alreadyThere, ref };
}

/* ── The run ───────────────────────────────────────────────────────────── */

/**
 * Opens, or reopens, the database connection.
 *
 * Two things here exist because of a real failure: the first full run held one
 * connection open while it uploaded 1,332 images, the managed pooler dropped
 * the idle socket, and the 'error' event that followed had no listener — Node
 * treats that as unhandled and killed the process part-way through, after the
 * batches that had already committed. So:
 *
 *   * `keepAlive` stops an idle socket looking dead to the pooler, and
 *   * the 'error' listener records the fault instead of throwing it at the
 *     event loop, to be raised as an ordinary error at the next query.
 *
 * The write phase also opens its own connection after the images are done, so
 * there is no long idle window in the first place.
 */
function openClient(databaseUrl) {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: resolveSslConfig(env),
    connectionTimeoutMillis: 20_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });
  client.on("error", (error) => {
    client.lastError = error;
  });
  return client;
}

/**
 * Connects and puts two guards on the session.
 *
 * `idle_in_transaction_session_timeout` exists because of the second real
 * failure: when the process died mid-transaction, the socket went away but the
 * server-side transaction did not — it sat `idle in transaction` holding its
 * locks, and the next run's first INSERT blocked on it until the server's own
 * two-minute statement timeout fired. The cap makes the database clean up after
 * a killed run by itself, so a resumed import is never stuck behind a
 * transaction nobody owns.
 *
 * `statement_timeout` is set to the server's own default so the behaviour is
 * the same whatever the connection string happens to carry.
 */
async function connectClient(databaseUrl) {
  const client = openClient(databaseUrl);
  await client.connect();
  await client.query("set idle_in_transaction_session_timeout = '60s'");
  await client.query("set statement_timeout = '120s'");
  return client;
}

const startedAt = new Date();
const runId = `${startedAt.toISOString().replace(/[:.]/g, "-")}`;
const counts = {
  seen: 0, inserted: 0, updated: 0, skipped: 0, rejected: 0, published: 0,
  imagesStored: 0, imagesReused: 0, imagesFailed: 0,
};
const reasons = {};
const rejections = [];
const problemsByRecord = [];
const recordReason = (bucket, reason) => {
  reasons[bucket] = reasons[bucket] ?? {};
  reasons[bucket][reason] = (reasons[bucket][reason] ?? 0) + 1;
};

async function main() {
  const dataset = await ensureDataset();

  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is not set (.env.local) — nothing to import into.");

  const needsStorage = options.images !== "none";
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (needsStorage && (!supabaseUrl || !serviceKey)) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to store images. " +
      "Run with --images none to import without them.",
    );
  }

  const supabase = needsStorage ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) : null;
  const imageCache = readImageCache();
  let db = await connectClient(databaseUrl);

  try {
    console.log(`
Penman Empire — cars import
  mode        : ${options.dryRun ? "DRY RUN (no products will be written)" : "live"}
  source      : ${DATASET_SOURCE}
  dataset     : ${dataset.revision}  (${(dataset.bytes / 1024 / 1024).toFixed(1)} MB)
  images      : ${options.images}${options.images === "embedded" ? " (bytes from the dataset itself)" : ""}
  status      : ${options.publish ? "published" : "draft (held for review)"}
  limit       : ${options.limit ?? "all records"}
`);

    // Read the parquet with raw BYTE_ARRAY values: see IMAGE_MAGIC note above.
    const file = await asyncBufferFromFile(dataset.path);
    const metadata = await parquetMetadataAsync(file);
    const totalInDataset = Number(metadata.num_rows);
    const rowEnd = options.limit ? Math.min(options.limit, totalInDataset) : totalInDataset;
    const rows = await parquetReadObjects({
      file,
      rowStart: 0,
      rowEnd,
      parsers: { stringFromBytes: (bytes) => bytes },
    });
    log(`• read ${rows.length} of ${totalInDataset} records`);

    // One SELECT for the whole run: which of these records already exist. The
    // connection is opened just for this, then closed again until the writes:
    // the image phase below can take ten minutes.
    const { rows: existingRows } = await db.query(
      `select id, source_id, slug, name, price, status, images, specs
         from public.products
        where inventory_source = $1`,
      [DATASET_SOURCE],
    );
    const existing = new Map(existingRows.map((row) => [row.source_id, row]));
    log(`• ${existing.size} record(s) from this source are already in the catalogue`);

    const categoryId = options.dryRun ? null : await ensureCategory(db);
    await db.end();
    const seenSourceIds = new Set();

    const pending = [];
    for (const row of rows) {
      counts.seen += 1;
      const mapped = mapRow(row);
      if (!mapped.ok) {
        counts.rejected += 1;
        recordReason("rejected", mapped.reason);
        if (rejections.length < 50) rejections.push({ reason: mapped.reason, rowIndex: Number(row["Unnamed: 0"] ?? -1) });
        continue;
      }

      const record = mapped.record;
      if (mapped.problems.length > 0) {
        problemsByRecord.push({ source_id: record.source_id, problems: mapped.problems });
        for (const problem of mapped.problems) recordReason("problems", problem);
      }

      // A duplicated key inside the file itself: the first row wins and the
      // repeat is counted, never written twice.
      if (seenSourceIds.has(record.source_id)) {
        counts.skipped += 1;
        recordReason("skipped", "duplicate_in_source");
        continue;
      }
      seenSourceIds.add(record.source_id);

      const previous = existing.get(record.source_id);
      const hash = importHashOf(record);

      if (previous) {
        const storedHash = previous.specs?.import_hash ?? null;
        if (storedHash === hash) {
          // The row already says exactly what the dataset says. The only thing
          // left to do is honour an explicit --publish, which is a status flip
          // and nothing more.
          if (options.publish && previous.status !== "published") {
            pending.push({ record, previous, image: row.image ?? null, publishOnly: true });
            continue;
          }
          counts.skipped += 1;
          recordReason("skipped", "unchanged");
          continue;
        }
        if (options.onlyMissing) {
          counts.skipped += 1;
          recordReason("skipped", "already_present");
          continue;
        }
        // The row is only updated when it can be shown to hold exactly what the
        // importer last wrote. No stored hash at all counts as "not ours": an
        // unknown provenance is a reason to leave the row alone, not a licence
        // to overwrite it.
        if (!storedHash || storedHash !== currentRowHash(previous)) {
          counts.skipped += 1;
          recordReason("skipped", "locally_modified");
          continue;
        }
      }

      record.specs.import_hash = hash;
      pending.push({ record, previous, image: row.image ?? null });
    }

    log(`• ${pending.length} record(s) to write, ${counts.skipped} skipped, ${counts.rejected} rejected`);

    // Images first, so a row is only ever written once its picture is in
    // place. In a dry run nothing is uploaded.
    for (const item of pending) {
      if (options.images === "none") continue;
      if (options.dryRun) { counts.imagesStored += 1; continue; }

      const result = await imageFor(supabase, item, imageCache);
      if (result.ok) {
        item.record.images = [result.ref];
        if (result.reused) counts.imagesReused += 1; else counts.imagesStored += 1;
      } else {
        item.record.images = [];
        counts.imagesFailed += 1;
        recordReason("images", result.reason);
        item.record.specs.image_problem = result.reason;
      }
      item.record.specs.image_stored = item.record.images.length > 0;
    }

    if (!options.dryRun) writeImageCache(imageCache);

    // Reopen for the writes. The upload phase above can take ten minutes, so no
    // connection is held across it. A dry run has nothing to upload and reopens
    // immediately, but it reopens all the same: the run summary is still written
    // to inventory_imports, which is the record the admin page reads.
    db = await connectClient(databaseUrl);

    // Batched writes inside transactions: a failure part-way leaves the
    // already-committed batches intact rather than rolling back 1,332 rows.
    for (let start = 0; start < pending.length; start += options.batch) {
      const batch = pending.slice(start, start + options.batch);
      if (options.dryRun) {
        for (const item of batch) {
          if (item.publishOnly) { counts.published += 1; recordReason("would", "publish"); continue; }
          if (item.previous) { counts.updated += 1; recordReason("would", "update"); }
          else { counts.inserted += 1; recordReason("would", "insert"); }
          if (options.publish) counts.published += 1;
        }
        continue;
      }

      if (db.lastError) throw connectionLost(db.lastError);

      await db.query("begin");
      try {
        for (const item of batch) {
          if (item.publishOnly) {
            await db.query(
              `update public.products
                  set status = 'published',
                      published_at = coalesce(published_at, now()),
                      updated_at = now()
                where id = $1 and inventory_source = $2`,
              [item.previous.id, DATASET_SOURCE],
            );
            counts.published += 1;
            recordReason("written", "publish");
            continue;
          }

          const written = await writeRecord(db, item, categoryId);
          if (written === "inserted") { counts.inserted += 1; recordReason("written", "insert"); }
          else { counts.updated += 1; recordReason("written", "update"); }
          if (options.publish) counts.published += 1;
        }
        await db.query("commit");
      } catch (error) {
        await db.query("rollback");
        throw error;
      }
      if (!options.quiet) process.stdout.write(`  … ${Math.min(start + options.batch, pending.length)}/${pending.length}\r`);
    }

    const finishedAt = new Date();
    const summary = {
      recordsSeen: counts.seen,
      inserted: counts.inserted,
      updated: counts.updated,
      skipped: counts.skipped,
      rejected: counts.rejected,
      published: counts.published,
      imagesStored: counts.imagesStored,
      imagesReused: counts.imagesReused,
      imagesFailed: counts.imagesFailed,
    };

    if (options.record) {
      await recordRun(db, { dataset, startedAt, finishedAt, summary });
    }

    writeErrorLog({ summary, reasons, rejections, problemsByRecord });
    printSummary({ summary, finishedAt });
  } catch (error) {
    // Whatever went wrong, say what was already written and how to finish the
    // job: the import is resumable because every batch commits on its own and
    // every record is keyed by its source id.
    console.error(`\nImport stopped: ${error.message}`);
    console.error(
      `  ${counts.inserted} row(s) were inserted and committed before it stopped.\n` +
      "  Re-run the same command to finish: already-written records are recognised by their\n" +
      "  source id and counted as skipped rather than inserted twice.",
    );
    try {
      await recordRun(db, {
        dataset,
        startedAt,
        finishedAt: new Date(),
        summary: { ...counts, recordsSeen: counts.seen, imagesStored: counts.imagesStored, imagesReused: counts.imagesReused, imagesFailed: counts.imagesFailed, published: counts.published },
        error: error.message,
      });
    } catch {
      // The connection that just failed is not expected to accept a write; the
      // summary above is the report in that case.
    }
    process.exitCode = 1;
  } finally {
    // `end()` on a socket the pooler already closed resolves rather than throws.
    await db.end().catch(() => {});
  }
}

/** Turns a recorded connection fault into an error the run can report. */
function connectionLost(cause) {
  return new Error(`the database connection was lost (${cause.message}). Re-run to resume.`);
}

async function imageFor(supabase, item, imageCache) {
  const { record, image } = item;

  if (options.images === "embedded") {
    const bytes = image?.bytes ? Buffer.from(image.bytes) : null;
    if (!bytes || bytes.length === 0) return { ok: false, reason: "no_embedded_image" };

    const mime = sniffImage(bytes);
    if (!mime) return { ok: false, reason: "unrecognised_image_bytes" };
    return storeImage(supabase, { slug: record.slug, bytes, mime, cache: imageCache });
  }

  if (!record.source_url) return { ok: false, reason: "no_source_url" };
  const fetched = await fetchSourceImage(record.source_url);
  if (!fetched.ok) return fetched;
  return storeImage(supabase, { slug: record.slug, bytes: fetched.bytes, mime: fetched.mime, cache: imageCache });
}

async function ensureCategory(db) {
  const { rows } = await db.query("select id from public.product_categories where slug = $1", [IMPORT_CATEGORY.slug]);
  if (rows[0]) return rows[0].id;

  const inserted = await db.query(
    `insert into public.product_categories (slug, name, description, position)
     values ($1, $2, $3, $4)
     on conflict (slug) do update set name = excluded.name
     returning id`,
    [IMPORT_CATEGORY.slug, IMPORT_CATEGORY.name, IMPORT_CATEGORY.description, IMPORT_CATEGORY.position],
  );
  log(`• created the "${IMPORT_CATEGORY.slug}" product category`);
  return inserted.rows[0].id;
}

async function writeRecord(db, item, categoryId) {
  const { record, previous } = item;
  const description = describeRecord(record);
  const status = options.publish ? "published" : "draft";
  const now = new Date();

  if (!previous) {
    await db.query(
      `insert into public.products
         (slug, name, description, price, currency, category_id, track_stock, stock_quantity,
          availability, images, is_featured, status, seo_title, seo_description, published_at,
          inventory_source, source_id, source_url, imported_at, specs)
       values ($1,$2,$3,$4,$5,$6,false,0,'unavailable',$7::jsonb,false,$8,$9,$10,
               case when $8 = 'published' then $11::timestamptz else null end,
               $12,$13,$14,$11::timestamptz,$15::jsonb)`,
      [
        record.slug, record.name, description, record.price, record.currency, categoryId,
        JSON.stringify(record.images), status,
        `${record.name} — imported listing | Penman Empire`,
        `Imported marketplace listing for ${record.name}. Not verified by Penman Empire.`,
        now,
        DATASET_SOURCE, record.source_id, record.source_url, JSON.stringify(record.specs),
      ],
    );
    return "inserted";
  }

  // An update deliberately does not touch `created_at`, and only writes the
  // columns the importer owns. A human who edited the price or replaced the
  // image never reaches here: the hash check upstream has already skipped them.
  await db.query(
    `update public.products
        set name = $2, description = $3, price = $4, category_id = $5,
            images = $6::jsonb, specs = $7::jsonb, source_url = $8, imported_at = $9,
            status = case when $10 = 'published' then 'published' else status end,
            published_at = case when $10 = 'published' and published_at is null then $9::timestamptz else published_at end,
            updated_at = now()
      where id = $1 and inventory_source = $11`,
    [
      previous.id, record.name, description, record.price, categoryId,
      JSON.stringify(record.images), JSON.stringify(record.specs), record.source_url, now,
      status, DATASET_SOURCE,
    ],
  );
  return "updated";
}

async function recordRun(db, { dataset, startedAt: start, finishedAt, summary, error }) {
  await db.query(
    `insert into public.inventory_imports
       (source, mode, dataset_url, dataset_revision, dataset_bytes, started_at, finished_at, duration_ms,
        records_seen, inserted, updated, skipped, rejected, published,
        images_stored, images_reused, images_failed, summary, report)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb,$19::jsonb)`,
    [
      DATASET_SOURCE,
      options.dryRun ? "dry-run" : "run",
      options.datasetUrl,
      dataset.revision,
      dataset.bytes,
      start, finishedAt, finishedAt.getTime() - start.getTime(),
      summary.recordsSeen, summary.inserted, summary.updated, summary.skipped, summary.rejected, summary.published,
      summary.imagesStored, summary.imagesReused, summary.imagesFailed,
      JSON.stringify({ ...reasons, options: { images: options.images, publish: options.publish, limit: options.limit } }),
      JSON.stringify({
        ...(error ? { error } : {}),
        rejections: rejections.slice(0, 25),
        problems: problemsByRecord.slice(0, 25),
      }),
    ],
  );
}

function writeErrorLog(payload) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const file = path.join(LOG_DIR, `${runId}.json`);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  log(`• log: ${path.relative(process.cwd(), file)}`);
}

function printSummary({ summary, finishedAt }) {
  const lines = [];
  lines.push("");
  lines.push(options.dryRun ? "DRY RUN — nothing was written to products." : "Import complete.");
  lines.push(`  records read      ${summary.recordsSeen}`);
  lines.push(`  inserted          ${summary.inserted}`);
  lines.push(`  updated           ${summary.updated}`);
  lines.push(`  skipped           ${summary.skipped}`);
  lines.push(`  rejected          ${summary.rejected}`);
  if (options.images !== "none") {
    // In a dry run nothing is uploaded, so the same counter is labelled for
    // what it actually means rather than reporting a store that did not happen.
    const storedLabel = options.dryRun ? "images to store" : "images stored";
    lines.push(`  ${storedLabel.padEnd(18)}${summary.imagesStored}`);
    lines.push(`  images reused     ${summary.imagesReused}`);
    lines.push(`  images failed     ${summary.imagesFailed}`);
  }
  lines.push(`  status            ${options.publish ? "published" : "draft (review in /admin/import)"}`);
  lines.push(`  finished          ${finishedAt.toISOString()}`);

  for (const bucket of ["rejected", "skipped", "problems", "images", "written", "would"]) {
    if (!reasons[bucket]) continue;
    const detail = Object.entries(reasons[bucket]).map(([reason, n]) => `${reason}=${n}`).join(", ");
    lines.push(`  ${bucket.padEnd(17)} ${detail}`);
  }

  lines.push("");
  lines.push("  Hand-curated listings are untouched by this run: only rows whose");
  lines.push(`  inventory_source is ${DATASET_SOURCE} are ever written.`);
  console.log(lines.join("\n"));
}

main().catch((error) => {
  console.error(`\nImport failed: ${error.message}`);
  process.exitCode = 1;
});
