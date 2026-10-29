/**
 * Database verification.
 *
 * Applies supabase/migrations/*.sql and supabase/seed.sql against an embedded
 * PostgreSQL engine (PGlite) with the small pieces of Supabase's own schema
 * stubbed in, then asserts the resulting shape:
 *
 *   * every expected table exists
 *   * RLS is enabled on every table
 *   * the expected policies and indexes are present
 *   * constraints actually reject bad data
 *   * the development seed loads with the expected row counts
 *
 * Run with:  npm run db:verify
 *
 * This proves the SQL is valid and self-consistent. It does not replace testing
 * against a real Supabase project, which has additional extensions and roles.
 */
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const failures = [];
let checks = 0;

function check(label, condition, detail = "") {
  checks += 1;
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Minimal stand-ins for the Supabase-managed schemas the migrations touch. */
const SUPABASE_STUBS = `
create schema if not exists auth;
create schema if not exists storage;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb
);

create or replace function auth.uid() returns uuid
language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null
);

alter table storage.objects enable row level security;
`;

const db = new PGlite();
console.log("\nApplying Supabase schema stubs…");
await db.exec(SUPABASE_STUBS);

const migrationsDir = join(root, "supabase", "migrations");
const migrations = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

for (const file of migrations) {
  console.log(`Applying migration ${file}…`);
  try {
    await db.exec(readFileSync(join(migrationsDir, file), "utf8"));
    check(`${file} applied cleanly`, true);
  } catch (error) {
    check(`${file} applied cleanly`, false, error.message);
  }
}

console.log("Loading supabase/seed.sql…");
try {
  await db.exec(readFileSync(join(root, "supabase", "seed.sql"), "utf8"));
  check("seed.sql applied cleanly", true);
} catch (error) {
  check("seed.sql applied cleanly", false, error.message);
}

console.log("\nSchema assertions");

const EXPECTED_TABLES = [
  "profiles",
  "vehicles",
  "rental_enquiries",
  "properties",
  "property_enquiries",
  "product_categories",
  "products",
  "shop_enquiries",
  "site_settings",
  "contact_messages",
  // Imported inventory (migration 0005). Its policies are admin-only, so it is
  // also asserted below alongside the enquiry tables.
  "inventory_imports",
];

const { rows: tables } = await db.query(
  `select c.relname as name, c.relrowsecurity as rls
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'`,
);
const tableMap = new Map(tables.map((t) => [t.name, t]));

for (const name of EXPECTED_TABLES) {
  check(`public.${name} exists`, tableMap.has(name));
  check(`public.${name} has RLS enabled`, tableMap.get(name)?.rls === true);
}

const { rows: policies } = await db.query(
  `select tablename, policyname from pg_policies where schemaname = 'public'`,
);
const policyTables = new Set(policies.map((p) => p.tablename));
for (const name of expectedPolicyTables()) {
  check(`RLS policy present on public.${name}`, policyTables.has(name));
}
function expectedPolicyTables() {
  return [...EXPECTED_TABLES];
}

// Enquiry tables — and the import-run log, which describes internal operations
// rather than catalogue content — must be administration-only. Policies are
// granted to PUBLIC by default, so the meaningful assertion is that every USING
// / WITH CHECK expression on those tables actually gates on is_admin() — not
// merely that the policy is silently absent.
const ENQUIRY_TABLES = [
  "rental_enquiries",
  "property_enquiries",
  "shop_enquiries",
  "contact_messages",
  "inventory_imports",
];
const { rows: enquiryPolicies } = await db.query(
  `select tablename, policyname, coalesce(qual, '') as qual, coalesce(with_check, '') as with_check
     from pg_policies
    where schemaname = 'public'
      and tablename = any($1)`,
  [ENQUIRY_TABLES],
);

for (const table of ENQUIRY_TABLES) {
  const forTable = enquiryPolicies.filter((p) => p.tablename === table);
  check(`admin-only policy exists on ${table}`, forTable.length > 0);
  const allGated = forTable.every(
    (p) => p.qual.includes("is_admin") && (p.with_check === "" || p.with_check.includes("is_admin")),
  );
  check(
    `every ${table} policy gates on is_admin() — no anonymous read or write path`,
    allGated,
    forTable.map((p) => `${p.policyname}: using(${p.qual})`).join(" | "),
  );
}

// Published listings must be readable by anyone, but only published rows.
const { rows: vehicleRead } = await db.query(
  `select coalesce(qual, '') as qual from pg_policies
    where schemaname = 'public' and tablename = 'vehicles' and cmd = 'SELECT'`,
);
const publicRead = vehicleRead.some(
  (p) => p.qual.includes("'published'") && p.qual.includes("is_admin"),
);
check("public SELECT on vehicles is restricted to published rows", publicRead, JSON.stringify(vehicleRead.map((p) => p.qual)));

// Unique slug indexes.
for (const index of [
  "vehicles_slug_key",
  "properties_slug_key",
  "products_slug_key",
  "product_categories_slug_key",
]) {
  const { rows } = await db.query(`select 1 from pg_class where relname = $1 and relkind = 'i'`, [index]);
  check(`index ${index} exists`, rows.length > 0);
}

// Table-level CHECK constraints live in pg_constraint, not pg_class.
for (const constraint of ["rental_enquiries_dates_valid", "products_stock_quantity_check"]) {
  const { rows } = await db.query(
    `select 1 from pg_constraint where conname = $1 and contype = 'c'`,
    [constraint],
  );
  check(`CHECK constraint ${constraint} exists`, rows.length > 0);
}

console.log("\nConstraint behaviour");

/**
 * Assert that a statement is rejected because of a *constraint*, not because
 * of a missing table or some other unrelated error. Without this, a statement
 * failing with "relation does not exist" would look like a pass.
 */
async function expectConstraintViolation(label, sql, params = []) {
  try {
    await db.query(sql, params);
    check(label, false, "statement unexpectedly succeeded");
    return;
  } catch (error) {
    const code = error?.code ?? "";
    // 23xxx = integrity constraint violation
    const isConstraintViolation = typeof code === "string" && code.startsWith("23");
    check(
      label,
      isConstraintViolation,
      isConstraintViolation ? "" : `rejected with ${code || "unknown"}: ${error?.message ?? error}`,
    );
  }
}

await expectConstraintViolation(
  "vehicle with an unknown rate period is rejected",
  `insert into public.vehicles (slug, name, category, rate_period) values ('bad-rate', 'x', 'y', 'fortnight')`,
);
await expectConstraintViolation(
  "vehicle with an unknown status is rejected",
  `insert into public.vehicles (slug, name, category, status) values ('bad-status', 'x', 'y', 'live')`,
);
await expectConstraintViolation(
  "rental enquiry returning before pickup is rejected",
  `insert into public.rental_enquiries (name, phone, pickup_date, return_date)
   values ('A', '0801', '2026-05-10', '2026-05-01')`,
);
await db.exec(`insert into public.vehicles (slug, name, category) values ('duplicate-probe', 'Probe', 'Sedan')`);
await expectConstraintViolation(
  "duplicate vehicle slug is rejected",
  `insert into public.vehicles (slug, name, category) values ('duplicate-probe', 'dup', 'Sedan')`,
);
await db.exec(`delete from public.vehicles where slug = 'duplicate-probe'`);
await expectConstraintViolation(
  "product with negative stock is rejected",
  `insert into public.products (slug, name, stock_quantity) values ('neg', 'x', -5)`,
);
await expectConstraintViolation(
  "profile with an unknown role is rejected",
  `insert into public.profiles (id, email, role) values (gen_random_uuid(), 'x@y.z', 'superuser')`,
);
await expectConstraintViolation(
  "enquiry referencing an unknown vehicle is rejected by the foreign key",
  `insert into public.rental_enquiries (vehicle_id, name, phone, pickup_date, return_date)
   values ('00000000-0000-0000-0000-000000000000', 'A', '0801', '2026-05-01', '2026-05-02')`,
);

console.log("\nTrigger behaviour");
await db.exec(`insert into public.vehicles (slug, name, category) values ('trigger-probe', 'Probe', 'Sedan')`);
const { rows: created } = await db.query(
  `select created_at, updated_at from public.vehicles where slug = 'trigger-probe'`,
);
check("new rows receive created_at and updated_at", Boolean(created[0]?.created_at && created[0]?.updated_at));

await db.exec(`update public.vehicles set name = 'Probe 2' where slug = 'trigger-probe'`);
const { rows: updated } = await db.query(
  `select updated_at > created_at as advanced from public.vehicles where slug = 'trigger-probe'`,
);
check("set_updated_at trigger advances updated_at on change", updated[0]?.advanced === true);
await db.exec(`delete from public.vehicles where slug = 'trigger-probe'`);

console.log("\nSeed data");

for (const [table, expected] of [
  ["vehicles", 0],
  ["properties", 0],
  ["products", 0],
]) {
  const { rows } = await db.query(`select count(*)::int as n from public.${table}`);
  const count = rows[0]?.n ?? 0;
  check(`seeded ${table} (${count} rows)`, count === expected, `expected ${expected}`);
}

for (const [table, minimum] of [
  ["product_categories", 3],
  ["site_settings", 7],
]) {
  const { rows } = await db.query(`select count(*)::int as n from public.${table}`);
  const count = rows[0]?.n ?? 0;
  check(`seeded ${table} (${count} rows)`, count >= minimum, `expected at least ${minimum}`);
}

console.log("\nDashboard metrics query");
const { rows: metrics } = await db.query(
  `select
     (select count(*) from public.vehicles where status = 'published')::int as vehicles,
     (select count(*) from public.properties where status = 'published')::int as properties,
     (select count(*) from public.products where status = 'published')::int as products`,
);
check(
  "published counts are computable for an empty catalogue",
  metrics[0].vehicles === 0 && metrics[0].properties === 0 && metrics[0].products === 0,
  JSON.stringify(metrics[0]),
);

/* ══════════════════════════════════════════════════════════════════════
   Application-owned authentication (migration 0003)

   Placed last so the seed assertions above run against pristine seed data.
   Everything here asserts the two things that matter most about the auth
   schema: that the Supabase Auth dependency is genuinely severed, and that a
   session can only be valid when the database says so.
   ══════════════════════════════════════════════════════════════════════ */

console.log("\nAuthentication schema");

const { rows: profileFks } = await db.query(
  `select conname
     from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'f'
      and confrelid = 'auth.users'::regclass`,
);
check(
  "profiles is no longer a foreign key to auth.users",
  profileFks.length === 0,
  profileFks.map((r) => r.conname).join(", "),
);

const { rows: legacyFn } = await db.query(
  `select 1
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'handle_new_user'`,
);
check("legacy handle_new_user() provisioning function is gone", legacyFn.length === 0);

const { rows: legacyTrigger } = await db.query(
  `select 1 from pg_trigger where tgname = 'on_auth_user_created'`,
);
check("legacy on_auth_user_created trigger is gone", legacyTrigger.length === 0);

for (const column of [
  "password_hash",
  "phone",
  "status",
  "email_verified_at",
  "last_login_at",
]) {
  const { rows } = await db.query(
    `select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = $1`,
    [column],
  );
  check(`profiles.${column} exists`, rows.length > 0);
}

const { rows: roleDefault } = await db.query(
  `select column_default from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'role'`,
);
check(
  "profiles.role defaults to the non-admin 'viewer'",
  (roleDefault[0]?.column_default ?? "").includes("viewer"),
  roleDefault[0]?.column_default ?? "no default",
);

const { rows: emailIndex } = await db.query(
  `select 1 from pg_class where relname = 'profiles_email_key' and relkind = 'i'`,
);
check("profiles_email_key unique index survives", emailIndex.length > 0);

const { rows: statusCheck } = await db.query(
  `select 1 from pg_constraint where conname = 'profiles_status_check' and contype = 'c'`,
);
check("CHECK constraint profiles_status_check exists", statusCheck.length > 0);

// These tables must be RLS-enabled with NO policy. A missing policy is a
// stronger guarantee than a restrictive one: it denies anonymous and
// authenticated roles alike, so a session row — or another customer's saved
// listing — can never be read via the anon key. Asserting "zero policies" is
// the point, not merely that RLS is on.
//
// The account tables are on this list deliberately. A policy of
// `user_id = auth.uid()` would look like a control while enforcing nothing:
// auth.uid() resolves from a Supabase Auth JWT, and application-owned sessions
// do not carry one, so it evaluates to false for every real request.
const DENY_ALL_TABLES = [
  "sessions",
  "password_reset_tokens",
  "saved_vehicles",
  "saved_products",
  "saved_properties",
];

for (const table of DENY_ALL_TABLES) {
  const { rows } = await db.query(
    `select c.relrowsecurity as rls
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = $1`,
    [table],
  );
  check(`public.${table} exists`, rows.length > 0);
  check(`public.${table} has RLS enabled`, rows[0]?.rls === true);

  const { rows: tablePolicies } = await db.query(
    `select policyname from pg_policies where schemaname = 'public' and tablename = $1`,
    [table],
  );
  check(
    `public.${table} has no policy at all — deny-all to anon and authenticated`,
    tablePolicies.length === 0,
    tablePolicies.map((p) => p.policyname).join(", "),
  );
}

for (const index of ["sessions_token_hash_key", "password_reset_tokens_token_hash_key"]) {
  const { rows } = await db.query(
    `select 1 from pg_class where relname = $1 and relkind = 'i'`,
    [index],
  );
  check(`unique index ${index} exists`, rows.length > 0);
}

console.log("\nAuthentication behaviour");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

/** Mirrors the lookup in src/lib/auth/session.ts resolveSession(). */
const RESOLVE_SESSION = `select p.id
   from public.sessions s
   join public.profiles p on p.id = s.user_id
  where s.token_hash = $1
    and s.revoked_at is null
    and s.expires_at > now()
    and p.status = 'active'
  limit 1`;

await db.query(
  `insert into public.profiles (email, password_hash, full_name) values ($1, $2, $3)`,
  ["  Owner@PenmanEmpire.COM  ", "$argon2id$placeholder", "Owner"],
);
const { rows: createdOwner } = await db.query(
  `select id, email, role, status from public.profiles where full_name = 'Owner'`,
);
const owner = createdOwner[0];

check(
  "a stored email is normalized to lowercase and trimmed",
  owner?.email === "owner@penmanempire.com",
  owner?.email ?? "no row",
);
check("a new account is non-admin by default", owner?.role === "viewer", owner?.role ?? "none");
check("a new account is active by default", owner?.status === "active", owner?.status ?? "none");

await expectConstraintViolation(
  "duplicate account email is rejected regardless of case",
  `insert into public.profiles (email, password_hash) values ('OWNER@penmanempire.com', 'x')`,
);
await expectConstraintViolation(
  "profile with an unknown status is rejected",
  `insert into public.profiles (email, status) values ('status-probe@example.com', 'suspended')`,
);

const liveToken = newToken();
await db.query(
  `insert into public.sessions (user_id, token_hash, expires_at)
   values ($1, $2, now() + interval '1 hour')`,
  [owner.id, sha256(liveToken)],
);
const { rows: live } = await db.query(RESOLVE_SESSION, [sha256(liveToken)]);
check("a live session resolves to its user", live.length === 1);

const { rows: byRawToken } = await db.query(RESOLVE_SESSION, [liveToken]);
check(
  "the raw token is NOT a valid lookup key — only its hash is stored",
  byRawToken.length === 0,
);

await expectConstraintViolation(
  "a session token hash cannot be reused",
  `insert into public.sessions (user_id, token_hash, expires_at)
   values ($1, $2, now() + interval '1 hour')`,
  [owner.id, sha256(liveToken)],
);

const expiredToken = newToken();
await db.query(
  `insert into public.sessions (user_id, token_hash, expires_at)
   values ($1, $2, now() - interval '1 second')`,
  [owner.id, sha256(expiredToken)],
);
const { rows: expired } = await db.query(RESOLVE_SESSION, [sha256(expiredToken)]);
check("an expired session is rejected", expired.length === 0);

await db.query(`update public.sessions set revoked_at = now() where token_hash = $1`, [
  sha256(liveToken),
]);
const { rows: revoked } = await db.query(RESOLVE_SESSION, [sha256(liveToken)]);
check("a revoked session is rejected", revoked.length === 0);

// Spec test 14: a disabled account must not keep using its existing session.
const disabledToken = newToken();
await db.query(
  `insert into public.sessions (user_id, token_hash, expires_at)
   values ($1, $2, now() + interval '1 hour')`,
  [owner.id, sha256(disabledToken)],
);
await db.query(`update public.profiles set status = 'disabled' where id = $1`, [owner.id]);
const { rows: whileDisabled } = await db.query(RESOLVE_SESSION, [sha256(disabledToken)]);
check(
  "disabling an account immediately invalidates its live sessions",
  whileDisabled.length === 0,
);
await db.query(`update public.profiles set status = 'active' where id = $1`, [owner.id]);

const { rows: afterReenable } = await db.query(RESOLVE_SESSION, [sha256(disabledToken)]);
check("re-enabling an account restores its unrevoked sessions", afterReenable.length === 1);

// Sessions must not outlive their user.
await db.query(`insert into public.profiles (email) values ('cascade-probe@example.com')`);
const { rows: cascadeUser } = await db.query(
  `select id from public.profiles where email = 'cascade-probe@example.com'`,
);
const cascadeToken = newToken();
await db.query(
  `insert into public.sessions (user_id, token_hash, expires_at)
   values ($1, $2, now() + interval '1 hour')`,
  [cascadeUser[0].id, sha256(cascadeToken)],
);
await db.query(`delete from public.profiles where id = $1`, [cascadeUser[0].id]);
const { rows: orphaned } = await db.query(
  `select 1 from public.sessions where token_hash = $1`,
  [sha256(cascadeToken)],
);
check("sessions are deleted with their user (on delete cascade)", orphaned.length === 0);

console.log("\nAccount area");

// Enquiries may be attributed to the account that sent them, but must never
// require one: an enquiry is a business record first, and a guest submitting
// one is the ordinary case.
for (const table of ["rental_enquiries", "property_enquiries", "shop_enquiries"]) {
  const { rows } = await db.query(
    `select is_nullable from information_schema.columns
      where table_schema = 'public' and table_name = $1 and column_name = 'user_id'`,
    [table],
  );
  check(`public.${table} has a nullable user_id column`, rows[0]?.is_nullable === "YES", JSON.stringify(rows));

  const { rows: indexRows } = await db.query(
    `select indexname from pg_indexes
      where schemaname = 'public' and tablename = $1 and indexname = $2`,
    [table, `${table}_user_idx`],
  );
  check(`${table}_user_idx index exists`, indexRows.length === 1);
}

await db.query(
  `insert into public.rental_enquiries (name, phone, pickup_date, return_date)
   values ('Guest Enquirer', '08000000000', '2026-03-01', '2026-03-02')`,
);
const { rows: guestEnquiries } = await db.query(
  `select user_id from public.rental_enquiries where name = 'Guest Enquirer'`,
);
check(
  "an enquiry from a visitor with no account is still accepted",
  guestEnquiries.length === 1 && guestEnquiries[0].user_id === null,
  JSON.stringify(guestEnquiries),
);

const probeVehicle = (
  await db.query(
    `insert into public.vehicles (slug, name, category, status)
     values ('save-probe-vehicle', 'Save probe vehicle', 'SUV', 'published') returning id`,
  )
).rows[0].id;
const probeProduct = (
  await db.query(
    `insert into public.products (slug, name, status)
     values ('save-probe-product', 'Save probe product', 'published') returning id`,
  )
).rows[0].id;
const probeProperty = (
  await db.query(
    `insert into public.properties (slug, title, location, status)
     values ('save-probe-property', 'Save probe property', 'Lagos', 'published') returning id`,
  )
).rows[0].id;

// The duplicate-save guarantee is the whole point of the unique constraint: a
// double tap, a retry or two open tabs must not produce two rows.
for (const [table, column, listingId, noun] of [
  ["saved_vehicles", "vehicle_id", probeVehicle, "vehicle"],
  ["saved_products", "product_id", probeProduct, "product"],
  ["saved_properties", "property_id", probeProperty, "property"],
]) {
  await db.query(`insert into public.${table} (user_id, ${column}) values ($1, $2)`, [
    owner.id,
    listingId,
  ]);

  await expectConstraintViolation(
    `saving the same ${noun} twice is rejected by the database`,
    `insert into public.${table} (user_id, ${column}) values ($1, $2)`,
    [owner.id, listingId],
  );

  const { rows: afterDuplicate } = await db.query(
    `select 1 from public.${table} where user_id = $1 and ${column} = $2`,
    [owner.id, listingId],
  );
  check(`one ${noun} save row survives the duplicate attempt`, afterDuplicate.length === 1);

  await expectConstraintViolation(
    `a saved ${noun} must point at a listing that exists`,
    `insert into public.${table} (user_id, ${column}) values ($1, $2)`,
    [owner.id, "00000000-0000-0000-0000-000000000000"],
  );
}

// Removing a listing must tidy up the saves that referred to it, or the
// account page would show entries pointing at nothing.
await db.query(`delete from public.vehicles where id = $1`, [probeVehicle]);
const { rows: savesAfterListingDelete } = await db.query(
  `select 1 from public.saved_vehicles where vehicle_id = $1`,
  [probeVehicle],
);
check(
  "deleting a vehicle removes the saves that pointed at it (on delete cascade)",
  savesAfterListingDelete.length === 0,
);

// Deleting an account takes its saves with it, but must NOT erase the business
// record of what that customer asked for.
const { rows: doomed } = await db.query(
  `insert into public.profiles (email, password_hash) values ('delete-probe@example.com', 'x') returning id`,
);
const doomedId = doomed[0].id;
await db.query(
  `insert into public.property_enquiries (user_id, name, phone, property_title)
   values ($1, 'Doomed User', '08000000000', 'A property')`,
  [doomedId],
);
await db.query(`insert into public.saved_products (user_id, product_id) values ($1, $2)`, [
  doomedId,
  probeProduct,
]);

await db.query(`delete from public.profiles where id = $1`, [doomedId]);

const { rows: orphanedSaves } = await db.query(
  `select 1 from public.saved_products where user_id = $1`,
  [doomedId],
);
check("deleting an account deletes its saved listings (on delete cascade)", orphanedSaves.length === 0);

const { rows: survivingEnquiry } = await db.query(
  `select user_id, property_title from public.property_enquiries where name = 'Doomed User'`,
);
check(
  "deleting an account keeps its enquiries but clears the owner (on delete set null)",
  survivingEnquiry.length === 1 && survivingEnquiry[0].user_id === null,
  JSON.stringify(survivingEnquiry),
);

await db.close();

console.log(`\n${checks - failures.length}/${checks} checks passed`);
if (failures.length > 0) {
  console.error("\nFailures:");
  for (const failure of failures) console.error(`  • ${failure}`);
  process.exit(1);
}
console.log("Database schema verification passed.\n");
