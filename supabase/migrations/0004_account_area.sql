-- ════════════════════════════════════════════════════════════════════════
-- Penman Empire — customer account area
-- ────────────────────────────────────────────────────────────────────────
-- The account area answers three questions the schema could not answer
-- before: which enquiries belong to this customer, what has this customer
-- saved, and what has changed on their account recently. This migration
-- supplies the storage for the first two; the third is derived from the
-- timestamps already present.
--
-- What changes
--   1. Enquiry tables gain `user_id`, so an enquiry can belong to the
--      account that submitted it. It is NULL for every enquiry sent before
--      this migration, and stays NULL for guests who never sign in.
--   2. Three saved-listing tables, one per listing type, each with a unique
--      constraint that makes a duplicate save impossible in the database
--      rather than only in the code that writes it.
--
-- What deliberately does NOT change
--   * No existing row is touched, moved or deleted. Enquiries keep their
--     contents; `user_id` is simply unknown for the ones already there.
--   * No existing policy, index, trigger or constraint is altered.
--   * Enquiry submission stays open to anonymous visitors. An enquiry is a
--     business record first: it must still be accepted from a guest, so
--     `user_id` is an optional attribution, never a requirement.
--
-- Rollback: purely additive. Nothing is dropped, so re-running the earlier
-- migrations restores the previous shape with no data lost.
--
-- Note on the account area's read path: these tables carry no policy, so the
-- browser cannot reach them. Every account query runs on the server through
-- the service-role client, after the session has been resolved from the
-- cookie, and always filtered by that session's own user id. public.is_admin()
-- stays exactly as 0003 left it — inert under application-owned sessions, but
-- still referenced by the policies 0001 created, so dropping it is neither
-- possible nor desirable.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. Attribute enquiries to the account that sent them ────────────────
--
-- ON DELETE SET NULL, not CASCADE: an enquiry is business correspondence.
-- Deleting a customer account must not erase the record of what they asked
-- for, which the business may still be acting on and is required to keep.
-- The enquiry survives, anonymised, with its contact details intact.

alter table public.rental_enquiries
  add column if not exists user_id uuid references public.profiles (id) on delete set null;

alter table public.property_enquiries
  add column if not exists user_id uuid references public.profiles (id) on delete set null;

alter table public.shop_enquiries
  add column if not exists user_id uuid references public.profiles (id) on delete set null;

-- Partial indexes: every account query filters `where user_id = $1`, and a
-- partial index skips the rows that can never match (every guest enquiry
-- before this migration, and every enquiry since).
create index if not exists rental_enquiries_user_idx
  on public.rental_enquiries (user_id, created_at desc) where user_id is not null;
create index if not exists property_enquiries_user_idx
  on public.property_enquiries (user_id, created_at desc) where user_id is not null;
create index if not exists shop_enquiries_user_idx
  on public.shop_enquiries (user_id, created_at desc) where user_id is not null;

-- ── 2. Saved listings ───────────────────────────────────────────────────
--
-- One narrow table per listing type rather than a single polymorphic table
-- with a `kind` discriminator and three nullable foreign keys. The narrow
-- form keeps a real foreign key on every row, so the database — not the
-- application — guarantees that a saved row always points at a listing that
-- exists, and ON DELETE CASCADE means removing a listing quietly removes the
-- saves that referred to it. The flagged-alternative design cannot express
-- either guarantee.
--
-- UNIQUE (user_id, <listing>_id) is the duplicate-save guarantee. A double
-- tap, a retry, or two tabs saving at once produces a 23505 unique violation
-- that the server action treats as success, because the desired end state is
-- already true.

create table if not exists public.saved_vehicles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint saved_vehicles_unique unique (user_id, vehicle_id)
);

create table if not exists public.saved_products (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint saved_products_unique unique (user_id, product_id)
);

create table if not exists public.saved_properties (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint saved_properties_unique unique (user_id, property_id)
);

-- Serves the account page's "most recently saved first" ordering directly
-- from the index, and covers the uniqueness check the save action performs.
create index if not exists saved_vehicles_user_idx
  on public.saved_vehicles (user_id, created_at desc);
create index if not exists saved_products_user_idx
  on public.saved_products (user_id, created_at desc);
create index if not exists saved_properties_user_idx
  on public.saved_properties (user_id, created_at desc);

-- ── 3. Lock the saved-listing tables down completely ────────────────────
--
-- Row Level Security with NO policy, exactly as `sessions` and
-- `password_reset_tokens` are handled in 0003. That denies every anonymous
-- and every authenticated request, so these tables are readable only through
-- the service-role client from server code that has already resolved a
-- session and filtered by that session's user id.
--
-- A policy of `user_id = auth.uid()` was considered and rejected: `auth.uid()`
-- resolves from a Supabase Auth JWT, and application-owned sessions do not
-- carry one, so the policy would evaluate to false for every real request —
-- it would look like a security control while enforcing nothing. No policy is
-- weaker-looking and strictly stronger.

alter table public.saved_vehicles   enable row level security;
alter table public.saved_products   enable row level security;
alter table public.saved_properties enable row level security;
