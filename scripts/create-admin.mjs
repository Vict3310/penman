/**
 * Bootstrap the first administrator.
 *
 *   npm run create-admin -- --email you@penmanempire.com
 *
 * This is the one approved way to obtain administrator access. There is
 * deliberately no public admin-registration page and no default password: a
 * shipped default would be a permanent backdoor into the business's listing
 * data, and a public endpoint that can mint an administrator is worse than no
 * authentication at all.
 *
 * Safety properties
 *   * Runs only from a terminal, against DATABASE_URL. It is not reachable
 *     over HTTP in any form.
 *   * Hashes with Argon2id at the same parameters the application verifies
 *     with, so a bootstrapped account behaves exactly like a normal one.
 *   * Never prints or stores the hash. If no password is supplied one is
 *     generated, shown once, and never written anywhere else.
 *   * Promoting an existing account does NOT overwrite its password unless a
 *     password is explicitly supplied.
 *   * Uses a transaction, so a failure leaves the database untouched.
 *
 * Flags
 *   --email      required unless ADMIN_EMAIL or ADMIN_EMAIL_ALLOWLIST is set
 *   --password   optional; generated when omitted. Prefer omitting it: a
 *                password passed on the command line is captured in shell
 *                history and visible in the process list.
 *   --name       optional display name
 */
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { Client } from "pg";

import { connectionOptions } from "./database-ssl.mjs";

const require = createRequire(import.meta.url);
const { hash } = require("@node-rs/argon2");

/** Mirrors the Argon2id parameters in src/lib/auth/password.ts. */
const ARGON2ID_PARAMS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

function readEnvLocal() {
  const filePath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(filePath)) return {};

  const result = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = line.slice(0, equalsIndex).trim();
    const rawValue = line.slice(equalsIndex + 1).trim();
    result[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
  return result;
}

function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token?.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args.set(key, next);
      i += 1;
    } else {
      args.set(key, "true");
    }
  }
  return args;
}

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

/** A strong, human-transferable password. 24 chars from 18 random bytes. */
function generatePassword() {
  return randomBytes(18).toString("base64url");
}

const fileEnv = readEnvLocal();
const env = { ...fileEnv, ...process.env };
const args = parseArgs(process.argv.slice(2));

const databaseUrl = env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error(
    "\nDATABASE_URL is not set. Add it to .env.local (or export it) so the\n" +
      "script can reach the Postgres database that holds the user accounts.\n",
  );
  process.exit(1);
}

const allowlistFirst = (env.ADMIN_EMAIL_ALLOWLIST ?? "")
  .split(",")
  .map((value) => normalizeEmail(value))
  .filter(Boolean)[0];

const email = normalizeEmail(args.get("email") ?? env.ADMIN_EMAIL ?? allowlistFirst);
if (!email || !email.includes("@")) {
  console.error(
    "\nNo administrator email given. Pass one explicitly:\n\n" +
      "  npm run create-admin -- --email you@penmanempire.com\n",
  );
  process.exit(1);
}

const suppliedPassword = args.get("password") ?? env.ADMIN_PASSWORD;
const passwordWasGenerated = !suppliedPassword;
const password = suppliedPassword || generatePassword();

if (suppliedPassword && args.has("password")) {
  console.warn(
    "\nNote: a password given with --password is recorded in your shell history.\n" +
      "Omit it to have a strong one generated instead.\n",
  );
}

const fullName = args.get("name") ?? null;

// TLS parameters in DATABASE_URL are stripped so the explicit `ssl` policy is
// the one `pg` uses — see database-ssl.mjs.
const client = new Client(connectionOptions({ ...env, DATABASE_URL: databaseUrl }));

await client.connect();

try {
  const passwordHash = await hash(password, ARGON2ID_PARAMS);

  await client.query("begin");

  // Lock the table for the duration of the decision so two concurrent runs
  // cannot both believe they are creating the first account.
  const { rows: existing } = await client.query(
    "select id, role from public.profiles where email = $1 limit 1 for update",
    [email],
  );
  const { rows: totals } = await client.query(
    "select count(*)::int as total from public.profiles",
  );
  const totalAccounts = totals[0]?.total ?? 0;

  let outcome;
  let role;

  if (existing[0]) {
    // Promote. An existing password is preserved unless one was supplied —
    // rewriting it with a generated value would lock the owner out of an
    // account they were already using.
    const setPassword = suppliedPassword === undefined ? "" : ", password_hash = $2";
    const params = suppliedPassword === undefined ? [email] : [email, passwordHash];

    const { rows } = await client.query(
      `update public.profiles
          set role = 'admin',
              status = 'active',
              email_verified_at = coalesce(email_verified_at, now())${setPassword}
        where email = $1
        returning id, role`,
      params,
    );

    outcome = "promoted";
    role = rows[0]?.role;
  } else {
    const { rows } = await client.query(
      `insert into public.profiles (email, password_hash, full_name, role, email_verified_at)
       values ($1, $2, $3, 'admin', now())
       returning id, role`,
      [email, passwordHash, fullName],
    );

    outcome = "created";
    role = rows[0]?.role;
  }

  await client.query("commit");

  console.log("\n──────────────────────────────────────────────");
  console.log(`  ${outcome === "created" ? "Created" : "Promoted"} administrator`);
  console.log("──────────────────────────────────────────────");
  console.log(`  email    ${email}`);
  console.log(`  role     ${role}`);
  console.log(`  accounts ${totalAccounts + (outcome === "created" ? 1 : 0)} in the database`);

  // Only report a generated password when it was actually written. A promoted
  // account keeps the password it already had, so printing the generated value
  // here would hand the operator a password that does not work.
  if (outcome === "created" && passwordWasGenerated) {
    console.log(`  password ${password}`);
    console.log(
      "\n  Store this password in a password manager now. It is shown once,\n" +
        "  it was never written to disk, and it cannot be recovered later.",
    );
  } else if (outcome === "promoted") {
    console.log(
      suppliedPassword === undefined
        ? "  password unchanged (no password was supplied)"
        : "  password updated to the one you supplied",
    );
  }

  console.log(
    `\n  Sign in at ${env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/login` +
      "\n  then open /admin. The guard reads this profile from the database on\n" +
      "  every request, so no further configuration is needed.\n",
  );
} catch (error) {
  try {
    await client.query("rollback");
  } catch {
    // The original error is the useful one.
  }
  console.error(`\nFailed to create the administrator: ${error.message}\n`);
  process.exitCode = 1;
} finally {
  await client.end();
}
