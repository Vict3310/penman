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

// Enquiry tables must be administration-only. Policies are granted to PUBLIC by
// default, so the meaningful assertion is that every USING / WITH CHECK
// expression on those tables actually gates on is_admin() — not merely that the
// policy is silently absent.
const ENQUIRY_TABLES = ["rental_enquiries", "property_enquiries", "shop_enquiries", "contact_messages"];
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
await expectConstraintViolation(
  "duplicate vehicle slug is rejected",
  `insert into public.vehicles (slug, name, category) values ('demo-toyota-corolla-2022', 'dup', 'Sedan')`,
);
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

console.log("\nSeed data");

for (const [table, minimum] of [
  ["vehicles", 3],
  ["properties", 3],
  ["products", 3],
  ["product_categories", 3],
  ["site_settings", 7],
]) {
  const { rows } = await db.query(`select count(*)::int as n from public.${table}`);
  const count = rows[0]?.n ?? 0;
  check(`seeded ${table} (${count} rows)`, count >= minimum, `expected at least ${minimum}`);
}

const { rows: demoRows } = await db.query(
  `select count(*)::int as n from public.vehicles where name like '[DEMO]%'`,
);
check("seed records are clearly labelled [DEMO]", (demoRows[0]?.n ?? 0) >= 3);

console.log("\nDashboard metrics query");
const { rows: metrics } = await db.query(
  `select
     (select count(*) from public.vehicles where status = 'published')::int as vehicles,
     (select count(*) from public.properties where status = 'published')::int as properties,
     (select count(*) from public.products where status = 'published')::int as products`,
);
check(
  "published counts are computable and non-zero",
  metrics[0].vehicles > 0 && metrics[0].properties > 0 && metrics[0].products > 0,
  JSON.stringify(metrics[0]),
);

await db.close();

console.log(`\n${checks - failures.length}/${checks} checks passed`);
if (failures.length > 0) {
  console.error("\nFailures:");
  for (const failure of failures) console.error(`  • ${failure}`);
  process.exit(1);
}
console.log("Database schema verification passed.\n");
