-- ════════════════════════════════════════════════════════════════════════
-- Penman Empire — imported vehicle inventory
-- ────────────────────────────────────────────────────────────────────────
-- The cars-for-sale catalogue is public.products (see 0001_init.sql). Imported
-- marketplace listings live in that same table: this is not a second
-- inventory, and this migration modifies no existing row.
--
-- Provenance is nullable on purpose. NULL `inventory_source` means "curated by
-- hand", which is precisely what the importer refuses to touch, so no amount
-- of running it can rewrite a genuine listing's price, images or visibility.
--
-- `source_id` is unique per source, which is what makes a second import a
-- no-op instead of a duplicate.
-- ════════════════════════════════════════════════════════════════════════

alter table public.products
  add column if not exists inventory_source text,
  add column if not exists source_id        text,
  add column if not exists source_url       text,
  add column if not exists imported_at      timestamptz,
  add column if not exists specs            jsonb not null default '{}'::jsonb;

comment on column public.products.inventory_source is
  'Origin of an imported listing, e.g. huggingface:Binaryy/cars-for-sale. NULL = curated by hand.';
comment on column public.products.source_id is
  'Stable identifier from the source dataset. Unique together with inventory_source.';
comment on column public.products.source_url is
  'The source page or image URL the listing came from, kept for traceability.';
comment on column public.products.imported_at is
  'When this row was last written by the importer. NULL = never imported.';
comment on column public.products.specs is
  'Verified-from-source facts that have no dedicated column: year, mileage_km, condition, region, colour, make, model and the raw source strings.';

-- The deduplication key. Partial, so hand-curated rows (source_id null) are
-- never constrained by it.
create unique index if not exists products_source_key
  on public.products (inventory_source, source_id)
  where source_id is not null;

create index if not exists products_imported_idx
  on public.products (imported_at desc)
  where inventory_source is not null;

-- ════════════════════════════════════════════════════════════════════════
-- inventory_imports — one row per importer run (dry-run or real)
-- ────────────────────────────────────────────────────────────────────────
-- The CLI writes this, and the admin "Inventory import" screen reads it. It is
-- the audit trail: what the dataset revision was, what each run did, and which
-- records were rejected and why. Nothing here is derived from the client.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.inventory_imports (
  id                uuid primary key default gen_random_uuid(),
  source            text not null,
  mode              text not null check (mode in ('dry-run', 'run')),
  dataset_url       text,
  dataset_revision  text,
  dataset_bytes     bigint,
  started_at        timestamptz not null default now(),
  finished_at       timestamptz,
  duration_ms       integer,
  records_seen      integer not null default 0,
  inserted          integer not null default 0,
  updated           integer not null default 0,
  skipped           integer not null default 0,
  rejected          integer not null default 0,
  published         integer not null default 0,
  images_stored     integer not null default 0,
  images_reused     integer not null default 0,
  images_failed     integer not null default 0,
  -- Counts grouped by reason (e.g. {"duplicate_in_source": 12}).
  summary           jsonb not null default '{}'::jsonb,
  -- A bounded sample of the rejected/skipped rows, so the failures are
  -- inspectable from the admin screen without reading the log file.
  report            jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists inventory_imports_source_idx
  on public.inventory_imports (source, started_at desc);

alter table public.inventory_imports enable row level security;

-- Administrators only, in both directions. There is no public read: an import
-- run is operational data, not catalogue data.
drop policy if exists inventory_imports_admin_only on public.inventory_imports;
create policy inventory_imports_admin_only on public.inventory_imports
  for all using (public.is_admin()) with check (public.is_admin());
