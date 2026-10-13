-- ════════════════════════════════════════════════════════════════════════
-- Penman Empire — initial schema
-- ────────────────────────────────────────────────────────────────────────
-- Covers: profiles, vehicles, rental_enquiries, properties,
--         property_enquiries, product_categories, products,
--         shop_enquiries, site_settings
--
-- Conventions
--   * Every business table has created_at / updated_at (UTC, trigger maintained).
--   * Business records use soft archival: status = 'archived' rather than DELETE.
--   * Media is stored as an ordered JSONB array of *storage references*
--     ({ path, url, alt }) — never embedded file bytes.
--   * Status vocabularies are enforced by CHECK constraints. Valid values:
--       publish status : draft | published | archived
--       enquiry status : new | contacted | confirmed | declined | closed
--       shop order     : new | contacted | fulfilled | cancelled
--       availability   : available | unavailable | maintenance | reserved | sold | let
--   * Row Level Security is ON for every table. Public visitors may read only
--     published listings. Enquiry INSERTs happen exclusively through
--     server-side code using the service-role key — there is deliberately no
--     anon INSERT policy.
-- ════════════════════════════════════════════════════════════════════════

-- NOTE: no extensions are required. `gen_random_uuid()` has been part of
-- PostgreSQL core since v13, which every current Supabase project runs, so we
-- deliberately avoid depending on pgcrypto.

-- ── shared trigger: keep updated_at honest ──────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════
-- 1. profiles  (administrator / staff accounts)
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        text not null default 'viewer'
              check (role in ('admin', 'editor', 'viewer')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists profiles_email_key on public.profiles (lower(email));

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-provision a profile whenever an auth user is created.
-- New accounts start as 'viewer'. An existing administrator must promote
-- them explicitly (see README: "Creating the first administrator").
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── authorization helper used by every RLS policy ───────────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- ════════════════════════════════════════════════════════════════════════
-- 2. vehicles  (automobile rental module)
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.vehicles (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null,
  name              text not null,
  category          text not null,
  description       text,
  rate              numeric(12, 2),
  rate_period       text not null default 'day'
                    check (rate_period in ('hour', 'day', 'week', 'month')),
  currency          text not null default 'NGN',
  seats             integer check (seats is null or seats > 0),
  doors             integer check (doors is null or doors > 0),
  transmission      text check (transmission in ('automatic', 'manual', 'cvt', 'other')),
  fuel_type         text check (fuel_type in ('petrol', 'diesel', 'hybrid', 'electric', 'other')),
  year              integer check (year is null or (year between 1980 and 2100)),
  availability      text not null default 'available'
                    check (availability in ('available', 'unavailable', 'maintenance', 'reserved')),
  rental_terms      text,
  images            jsonb not null default '[]'::jsonb,
  is_featured       boolean not null default false,
  status            text not null default 'draft'
                    check (status in ('draft', 'published', 'archived')),
  seo_title         text,
  seo_description   text,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists vehicles_slug_key on public.vehicles (slug);
create index if not exists vehicles_status_idx on public.vehicles (status);
create index if not exists vehicles_featured_idx on public.vehicles (is_featured) where status = 'published';
create index if not exists vehicles_category_idx on public.vehicles (category);
create index if not exists vehicles_availability_idx on public.vehicles (availability);

create trigger trg_vehicles_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

-- ════════════════════════════════════════════════════════════════════════
-- 3. rental_enquiries
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.rental_enquiries (
  id              uuid primary key default gen_random_uuid(),
  vehicle_id      uuid references public.vehicles (id) on delete set null,
  vehicle_name    text,
  name            text not null,
  phone           text not null,
  email           text,
  pickup_date     date not null,
  return_date     date not null,
  message         text,
  status          text not null default 'new'
                  check (status in ('new', 'contacted', 'confirmed', 'declined', 'closed')),
  internal_notes  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint rental_enquiries_dates_valid check (return_date >= pickup_date)
);

create index if not exists rental_enquiries_status_idx on public.rental_enquiries (status);
create index if not exists rental_enquiries_vehicle_idx on public.rental_enquiries (vehicle_id);
create index if not exists rental_enquiries_created_idx on public.rental_enquiries (created_at desc);

create trigger trg_rental_enquiries_updated_at
  before update on public.rental_enquiries
  for each row execute function public.set_updated_at();

-- ════════════════════════════════════════════════════════════════════════
-- 4. properties  (real estate module)
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.properties (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null,
  title             text not null,
  description       text,
  listing_type      text not null default 'sale'
                    check (listing_type in ('sale', 'rent')),
  property_type     text not null default 'house'
                    check (property_type in ('house', 'apartment', 'duplex', 'bungalow', 'land', 'commercial', 'other')),
  location          text not null,
  address           text,
  price             numeric(14, 2),
  price_type        text not null default 'fixed'
                    check (price_type in ('fixed', 'negotiable', 'on_request')),
  currency          text not null default 'NGN',
  bedrooms          integer check (bedrooms is null or bedrooms >= 0),
  bathrooms         integer check (bathrooms is null or bathrooms >= 0),
  area_sqm          numeric(10, 2) check (area_sqm is null or area_sqm >= 0),
  amenities         text[] not null default '{}',
  availability      text not null default 'available'
                    check (availability in ('available', 'reserved', 'sold', 'let')),
  contact_name      text,
  contact_phone     text,
  contact_email     text,
  images            jsonb not null default '[]'::jsonb,
  is_featured       boolean not null default false,
  status            text not null default 'draft'
                    check (status in ('draft', 'published', 'archived')),
  seo_title         text,
  seo_description   text,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists properties_slug_key on public.properties (slug);
create index if not exists properties_status_idx on public.properties (status);
create index if not exists properties_featured_idx on public.properties (is_featured) where status = 'published';
create index if not exists properties_listing_type_idx on public.properties (listing_type);
create index if not exists properties_property_type_idx on public.properties (property_type);
create index if not exists properties_location_idx on public.properties (location);
create index if not exists properties_price_idx on public.properties (price);

create trigger trg_properties_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

-- ════════════════════════════════════════════════════════════════════════
-- 5. property_enquiries
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.property_enquiries (
  id              uuid primary key default gen_random_uuid(),
  property_id     uuid references public.properties (id) on delete set null,
  property_title  text,
  name            text not null,
  phone           text not null,
  email           text,
  message         text,
  status          text not null default 'new'
                  check (status in ('new', 'contacted', 'confirmed', 'declined', 'closed')),
  internal_notes  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists property_enquiries_status_idx on public.property_enquiries (status);
create index if not exists property_enquiries_property_idx on public.property_enquiries (property_id);
create index if not exists property_enquiries_created_idx on public.property_enquiries (created_at desc);

create trigger trg_property_enquiries_updated_at
  before update on public.property_enquiries
  for each row execute function public.set_updated_at();

-- ════════════════════════════════════════════════════════════════════════
-- 6. product_categories
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.product_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null,
  name        text not null,
  description text,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists product_categories_slug_key on public.product_categories (slug);
create index if not exists product_categories_position_idx on public.product_categories (position);

create trigger trg_product_categories_updated_at
  before update on public.product_categories
  for each row execute function public.set_updated_at();

-- ════════════════════════════════════════════════════════════════════════
-- 7. products  (online shop module)
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null,
  name              text not null,
  sku               text,
  description       text,
  price             numeric(12, 2),
  currency          text not null default 'NGN',
  category_id       uuid references public.product_categories (id) on delete set null,
  track_stock       boolean not null default false,
  stock_quantity    integer not null default 0 check (stock_quantity >= 0),
  availability      text not null default 'available'
                    check (availability in ('available', 'unavailable', 'reserved')),
  images            jsonb not null default '[]'::jsonb,
  is_featured       boolean not null default false,
  status            text not null default 'draft'
                    check (status in ('draft', 'published', 'archived')),
  seo_title         text,
  seo_description   text,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists products_slug_key on public.products (slug);
create index if not exists products_status_idx on public.products (status);
create index if not exists products_featured_idx on public.products (is_featured) where status = 'published';
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_price_idx on public.products (price);

create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ════════════════════════════════════════════════════════════════════════
-- 8. shop_enquiries  (initial release: enquiry / contact-to-order workflow)
--    Structured so a future cart & checkout can be layered on top without
--    rebuilding: `quantity` and `channel` are already captured.
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.shop_enquiries (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid references public.products (id) on delete set null,
  product_name    text,
  name            text not null,
  phone           text not null,
  email           text,
  quantity        integer not null default 1 check (quantity > 0),
  message         text,
  channel         text not null default 'form'
                  check (channel in ('form', 'whatsapp')),
  status          text not null default 'new'
                  check (status in ('new', 'contacted', 'fulfilled', 'cancelled')),
  internal_notes  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists shop_enquiries_status_idx on public.shop_enquiries (status);
create index if not exists shop_enquiries_product_idx on public.shop_enquiries (product_id);
create index if not exists shop_enquiries_created_idx on public.shop_enquiries (created_at desc);

create trigger trg_shop_enquiries_updated_at
  before update on public.shop_enquiries
  for each row execute function public.set_updated_at();

-- ════════════════════════════════════════════════════════════════════════
-- 9. site_settings  (key/value — every editable piece of brand content)
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.site_settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

create trigger trg_site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ════════════════════════════════════════════════════════════════════════
-- 9b. contact_messages  (general business enquiries from /contact)
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.contact_messages (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  phone           text not null,
  email           text,
  subject         text not null,
  message         text not null,
  status          text not null default 'new'
                  check (status in ('new', 'contacted', 'confirmed', 'declined', 'closed')),
  internal_notes  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists contact_messages_status_idx on public.contact_messages (status);
create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);

create trigger trg_contact_messages_updated_at
  before update on public.contact_messages
  for each row execute function public.set_updated_at();

-- ════════════════════════════════════════════════════════════════════════
-- 10. Row Level Security
-- ════════════════════════════════════════════════════════════════════════
alter table public.profiles            enable row level security;
alter table public.vehicles            enable row level security;
alter table public.rental_enquiries    enable row level security;
alter table public.properties          enable row level security;
alter table public.property_enquiries  enable row level security;
alter table public.product_categories  enable row level security;
alter table public.products            enable row level security;
alter table public.shop_enquiries      enable row level security;
alter table public.site_settings       enable row level security;
alter table public.contact_messages    enable row level security;

-- ── profiles: a user may read their own row; admins manage all ──────────
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ── Published listings are world-readable; only admins may mutate ───────
do $$
declare
  tbl text;
  publishable text[] := array['vehicles', 'properties', 'products'];
begin
  foreach tbl in array publishable loop
    execute format('drop policy if exists %I_public_read on public.%I', tbl, tbl);
    execute format(
      'create policy %I_public_read on public.%I for select using (status = ''published'' or public.is_admin())',
      tbl, tbl
    );

    execute format('drop policy if exists %I_admin_write on public.%I', tbl, tbl);
    execute format(
      'create policy %I_admin_write on public.%I for all using (public.is_admin()) with check (public.is_admin())',
      tbl, tbl
    );
  end loop;
end;
$$;

-- ── product_categories: world-readable, admin-managed ───────────────────
drop policy if exists product_categories_public_read on public.product_categories;
create policy product_categories_public_read on public.product_categories
  for select using (true);

drop policy if exists product_categories_admin_write on public.product_categories;
create policy product_categories_admin_write on public.product_categories
  for all using (public.is_admin()) with check (public.is_admin());

-- ── site_settings: world-readable (public site renders from it) ─────────
drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings
  for select using (true);

drop policy if exists site_settings_admin_write on public.site_settings;
create policy site_settings_admin_write on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ── Enquiries: NO anon access at all. Admin-only read/write. ────────────
--    Public submissions arrive through server actions using the
--    service-role key, which bypasses RLS by design.
do $$
declare
  tbl text;
  enquiry_tables text[] := array['rental_enquiries', 'property_enquiries', 'shop_enquiries', 'contact_messages'];
begin
  foreach tbl in array enquiry_tables loop
    execute format('drop policy if exists %I_admin_only on public.%I', tbl, tbl);
    execute format(
      'create policy %I_admin_only on public.%I for all using (public.is_admin()) with check (public.is_admin())',
      tbl, tbl
    );
  end loop;
end;
$$;
