/**
 * Pure helpers for the cars-for-sale importer.
 *
 * Everything in this module is a plain function over plain values — no
 * database, no network, no filesystem — which is what makes the parsing rules
 * testable (see tests/cars-import.test.ts) instead of only observable by
 * running a 1,332-record import against production.
 *
 * ── The one thing to know about this dataset ────────────────────────────
 * The parquet has BOTH `Car Name` and `Car Name.1`, and they are not the same
 * ordering: in row 0, `Car Name` says "Toyota Sequoia 2005 Gray" while the
 * embedded image is the file for "Acura ILX 2018 Black". Checked against all
 * 1,332 embedded image paths, `Car Name.1` matches its own row's image 1,332
 * times out of 1,332, and `Car Name` matches 16 times — i.e. `Car Name` is a
 * mis-merged column from a dataframe join. `Car Name` is therefore recorded as
 * provenance (`specs.source_title_alt`) and never used as the listing name.
 * Reading the wrong column would pair every price and mileage with the wrong
 * vehicle, which is exactly the kind of silent corruption an import must not
 * produce.
 */

import { createHash } from "node:crypto";

/** Identifies this dataset in the database. Kept stable: it is half the dedupe key. */
export const DATASET_SOURCE = "huggingface:Binaryy/cars-for-sale";

/** The dataset revision this importer was written against. */
export const DATASET_URL =
  "https://huggingface.co/datasets/Binaryy/cars-for-sale/resolve/main/data/train-00000-of-00001-b41d1d2b26fde43c.parquet";

/** Product category imported cars are filed under. Created if missing. */
export const IMPORT_CATEGORY = { slug: "cars", name: "Cars", description: "Vehicles for sale.", position: 0 };

/**
 * A Nigerian used-car mileage is routinely into the hundreds of thousands.
 * Above this a figure stops being a mileage and starts being a data error:
 * the dataset contains one row claiming 368,379,820 km.
 */
const MAX_PLAUSIBLE_MILEAGE_KM = 1_000_000;

/** Below this a "price" is a deposit or a typo, not a car price. */
const MIN_PLAUSIBLE_PRICE_NGN = 100_000;
const MAX_PLAUSIBLE_PRICE_NGN = 5_000_000_000;

const COLOURS = new Map([
  ["black", "Black"],
  ["white", "White"],
  ["silver", "Silver"],
  ["gray", "Gray"],
  ["grey", "Gray"],
  ["blue", "Blue"],
  ["red", "Red"],
  ["gold", "Gold"],
  ["green", "Green"],
  ["brown", "Brown"],
  ["beige", "Beige"],
  ["burgundy", "Burgundy"],
  ["burgandy", "Burgundy"],
  ["ash", "Ash"],
  ["charcoal", "Charcoal"],
  ["cream", "Cream"],
  ["orange", "Orange"],
  ["yellow", "Yellow"],
  ["wine", "Wine"],
  ["purple", "Purple"],
  ["maroon", "Maroon"],
  ["pearl", "Pearl"],
  ["bronze", "Bronze"],
  ["teal", "Teal"],
  ["pink", "Pink"],
]);

const CONDITIONS = new Map([
  ["nigerian used", "nigerian_used"],
  ["foreign used", "foreign_used"],
  ["brand new", "brand_new"],
  ["new", "brand_new"],
  ["used", "used"],
]);

const CONDITION_LABELS = {
  nigerian_used: "Nigerian used",
  foreign_used: "Foreign used",
  brand_new: "Brand new",
  used: "Used",
  unknown: "Condition not stated",
};

/**
 * Reads a parquet text column that the reader handed back as raw bytes.
 *
 * hyparquet decodes every BYTE_ARRAY as UTF-8, which silently replaces the
 * invalid sequences inside a JPEG with U+FFFD. The importer therefore asks for
 * raw bytes (`parsers: { stringFromBytes: (b) => b }`) and decodes the text
 * columns here, where the intent is explicit.
 */
const decoder = new TextDecoder();

export function asText(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (value instanceof Uint8Array) return decoder.decode(value);
  if (ArrayBuffer.isView(value)) return decoder.decode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
  return String(value);
}

/** BigInt-safe: hyparquet returns INT64 columns as BigInt. */
export function asInteger(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "bigint" ? Number(value) : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/**
 * `₦ 7,350,000` → 7350000.
 *
 * Deliberately strict: a value with no digits, or one outside a plausible
 * range, is a rejection rather than a guess. Nothing here invents a price.
 */
export function parsePrice(raw) {
  const text = asText(raw)?.trim() ?? "";
  if (!text) return { value: null, problem: "missing_price" };
  const digits = text.replace(/[^\d]/g, "");
  if (!digits) return { value: null, problem: "unparsable_price" };

  const value = Number.parseInt(digits, 10);
  if (!Number.isFinite(value)) return { value: null, problem: "unparsable_price" };
  if (value < MIN_PLAUSIBLE_PRICE_NGN) return { value, problem: "implausible_price_low" };
  if (value > MAX_PLAUSIBLE_PRICE_NGN) return { value, problem: "implausible_price_high" };
  return { value, problem: null };
}

/**
 * `322770 km` → 322770.
 *
 * An out-of-range figure is dropped rather than stored: 368,379,820 km would
 * be presented to a customer as a real specification. The raw string is kept
 * in `specs.source_mileage_raw` either way, so nothing is hidden.
 */
export function parseMileage(raw) {
  const text = asText(raw)?.trim() ?? "";
  if (!text) return { value: null, problem: "missing_mileage" };

  const match = text.match(/([\d.,]+)\s*km/i);
  const digits = (match ? match[1] : text).replace(/[^\d]/g, "");
  if (!digits) return { value: null, problem: "unparsable_mileage" };

  const value = Number.parseInt(digits, 10);
  if (!Number.isFinite(value)) return { value: null, problem: "unparsable_mileage" };
  // Out of range means the reading is not a mileage at all, so it is dropped
  // rather than shown to a customer as one. `source_mileage_raw` keeps it.
  if (value <= 0) return { value: null, problem: "implausible_mileage" };
  if (value > MAX_PLAUSIBLE_MILEAGE_KM) return { value: null, problem: "implausible_mileage" };
  return { value, problem: null };
}

/** `Nigerian Used` → `nigerian_used`. Unknown values are labelled, never guessed. */
export function normaliseCondition(raw) {
  const text = (asText(raw) ?? "").trim().toLowerCase();
  if (!text) return { value: "unknown", label: CONDITION_LABELS.unknown, problem: "missing_condition" };
  const key = CONDITIONS.get(text);
  if (!key) return { value: "unknown", label: text, problem: "unknown_condition" };
  return { value: key, label: CONDITION_LABELS[key] ?? text, problem: null };
}

/**
 * Makes that are more than one word. Taking the first token as the make turns
 * "Land Rover Discovery 2011" into a car made by "Land", so the handful that
 * occur in this dataset are matched in full. The rest of the list is there for
 * the same reason when the source adds them.
 */
const MULTI_WORD_MAKES = [
  "Land Rover",
  "Mercedes Benz",
  "Alfa Romeo",
  "Aston Martin",
  "Rolls Royce",
  "Range Rover",
];

/**
 * Prefixes that are not part of the make.
 *
 * "New Changan Eado DT 2023" says the car is new; it does not name a marque
 * called "New". The word is dropped rather than stored as a make, and nothing
 * is invented in its place.
 */
const TITLE_PREFIX = /^(?:brand\s+|foreign\s+|nigerian\s+)?new\s+/i;

/**
 * `Toyota Camry 1999 Red` → { make, model, year, colour }.
 *
 * Only what the string actually states is returned — a title with no year gets
 * a null year rather than an inferred one.
 */
export function parseTitle(raw) {
  const original = (asText(raw) ?? "").replace(/\s+/g, " ").trim();
  if (!original) return { title: "", make: null, model: null, year: null, colour: null };

  // `title` keeps the whole string for display; the parse works on the string
  // without a leading condition word.
  const title = original.replace(TITLE_PREFIX, "");

  const yearMatch = title.match(/\b(19[5-9]\d|20[0-3]\d)\b/);
  const year = yearMatch ? Number.parseInt(yearMatch[1], 10) : null;

  const beforeYear = yearMatch ? title.slice(0, yearMatch.index).trim() : title;
  const tokens = beforeYear.split(" ").filter(Boolean);
  const multiWord = MULTI_WORD_MAKES.find((candidate) =>
    beforeYear.toLowerCase().startsWith(`${candidate.toLowerCase()} `),
  );
  const make = multiWord ?? tokens[0] ?? null;
  const modelTokens = multiWord ? tokens.slice(multiWord.split(" ").length) : tokens.slice(1);
  const model = modelTokens.length > 0 ? modelTokens.join(" ") : null;

  // The colour is the trailing token when it is a colour we recognise; a
  // title ending in anything else keeps a null colour rather than the last
  // word of the model name.
  const afterYear = yearMatch ? title.slice(yearMatch.index + yearMatch[0].length).trim() : "";
  const tail = (afterYear || title).split(" ").filter(Boolean).pop()?.toLowerCase() ?? "";
  const colour = COLOURS.get(tail) ?? null;

  return { title: original, make, model, year, colour };
}

/**
 * The stable identifier of the source listing.
 *
 * Every one of the 1,332 image URLs carries a numeric listing id
 * (`…/131812140_MTgwLTEzNS0…jpg`), all 1,332 of them distinct, so that is the
 * natural key. When it is absent the row's own durable values are hashed
 * instead — still deterministic, so a re-import still matches the row it made.
 */
export function sourceIdFrom(row) {
  const url = asText(row["Image URL"]) ?? "";
  const match = url.match(/\/(\d+)_/);
  if (match) return `cars45-${match[1]}`;

  const index = asInteger(row["Unnamed: 0"]);
  const fingerprint = [
    asText(row["Car Name.1"]) ?? "",
    asText(row["Region"]) ?? "",
    asText(row["Price"]) ?? "",
    asText(row["Mileage"]) ?? "",
    url,
  ].join("|");
  const hash = fnv1a(fingerprint);
  return index === null ? `row-${hash}` : `row-${index}-${hash}`;
}

/** Small non-cryptographic hash: enough to make a fallback key deterministic. */
function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** URL-safe slug, always ending in the source id so it cannot collide. */
export function slugFor(title, sourceId) {
  const base = (title || "vehicle")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  const suffix = String(sourceId).toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 24);
  return `${base || "vehicle"}-${suffix}`;
}

/**
 * One parquet row → one database row, or a reason it was rejected.
 *
 * A rejected row is never partially written: the caller counts it, records the
 * reason and moves on, which is what keeps one malformed record from ending a
 * 1,332-record import.
 */
export function mapRow(row, options = {}) {
  const problems = [];

  // `Car Name.1` is the row's own name (see the module header). `Car Name` is
  // kept only as provenance.
  const { title, make, model, year, colour } = parseTitle(row["Car Name.1"]);
  if (!title) return { ok: false, reason: "missing_name" };

  const sourceId = sourceIdFrom(row);
  if (!sourceId) return { ok: false, reason: "missing_source_id" };

  const price = parsePrice(row["Price"]);
  if (price.value === null) return { ok: false, reason: price.problem ?? "invalid_price" };
  if (price.problem) problems.push(price.problem);

  const mileage = parseMileage(row["Mileage"]);
  if (mileage.problem) problems.push(mileage.problem);

  const condition = normaliseCondition(row["Status"]);
  if (condition.problem) problems.push(condition.problem);

  const region = (asText(row["Region"]) ?? "").trim();
  if (!region) problems.push("missing_region");
  const [state, area] = region ? region.split(",").map((part) => part.trim()) : [null, null];

  const imageUrl = (asText(row["Image URL"]) ?? "").trim() || null;
  if (!imageUrl) problems.push("missing_image_url");
  if (year === null) problems.push("missing_year");
  if (!colour) problems.push("missing_colour");

  // The listing name is the dataset's own title, with nothing appended: no
  // invented trim, no invented year, no invented grade.
  const name = title;

  return {
    ok: true,
    problems,
    record: {
      source_id: sourceId,
      slug: slugFor(name, sourceId),
      name,
      price: price.value,
      currency: "NGN",
      source_url: imageUrl,
      specs: {
        year,
        mileage_km: mileage.value,
        condition: condition.value,
        condition_label: condition.label,
        colour,
        make,
        model,
        region: region || null,
        state: state || null,
        area: area || null,
        source_title_alt: asText(row["Car Name"]) || null,
        source_price_raw: asText(row["Price"]) || null,
        source_mileage_raw: asText(row["Mileage"]) || null,
        source_row_index: asInteger(row["Unnamed: 0"]),
        source_image_path: asText(row.image?.path) || null,
        historic_listing: true,
        availability_note: "Historic marketplace listing — Penman Empire has not verified this vehicle or its availability.",
        price_note: "Asking price from the source marketplace, not a Penman Empire quote.",
        imported_by: options.importer ?? "scripts/import-cars.mjs",
      },
    },
  };
}

/**
/**
 * sha256 of exactly the source-derived fields the importer is responsible for.
 *
 * Stored on every imported row as `specs.import_hash`. It is the contract that
 * makes re-running safe: the importer only overwrites a row when the row still
 * holds exactly what it last wrote.
 */
export function importHashOf(record) {
  const { year, mileage_km, condition, colour, make, model, region, source_price_raw, source_mileage_raw } = record.specs;
  return createHash("sha256")
    .update(JSON.stringify({
      name: record.name,
      price: record.price,
      specs: { year, mileage_km, condition, colour, make, model, region, source_price_raw, source_mileage_raw },
    }))
    .digest("hex");
}

/**
 * The same hash, computed from a row already in the database.
 *
 * If this does not equal the stored `import_hash`, somebody has changed the row
 * since the import — a price, a name, a specification — and the importer must
 * leave it alone. That comparison is the whole reason these fields are hashed
 * rather than compared one by one.
 */
export function currentRowHash(row) {
  const specs = row.specs ?? {};
  return createHash("sha256")
    .update(JSON.stringify({
      name: row.name,
      price: row.price === null || row.price === undefined ? null : Number(row.price),
      specs: {
        year: specs.year ?? null,
        mileage_km: specs.mileage_km ?? null,
        condition: specs.condition ?? null,
        colour: specs.colour ?? null,
        make: specs.make ?? null,
        model: specs.model ?? null,
        region: specs.region ?? null,
        source_price_raw: specs.source_price_raw ?? null,
        source_mileage_raw: specs.source_mileage_raw ?? null,
      },
    }))
    .digest("hex");
}

/**
 * The description, assembled only from values the source actually states.
 *
 * It is deliberately not marketing copy: there is no engine size, no service
 * history and no accident record in this dataset, so none is written.
 */
export function describe(record) {
  const specs = record.specs;
  const parts = [];
  if (specs.condition_label) parts.push(specs.condition_label);
  if (specs.year) parts.push(String(specs.year));
  if (specs.mileage_km) parts.push(`${specs.mileage_km.toLocaleString("en-NG")} km`);
  if (specs.colour) parts.push(specs.colour);
  if (specs.region) parts.push(specs.region);

  return [
    `${record.name}.`,
    parts.length > 0 ? `${parts.join(" · ")}.` : null,
    "Imported marketplace listing held for review: the price, condition and availability are the source's, not Penman Empire's, and have not been verified.",
  ]
    .filter(Boolean)
    .join(" ");
}
