-- ════════════════════════════════════════════════════════════════════════
-- Penman Empire — DEVELOPMENT SEED
-- ────────────────────────────────────────────────────────────────────────
-- Site settings and empty catalogue categories for development.
-- Listing rows are intentionally omitted; use the curated photo reference
-- catalogue script after migrations to populate cars and homes.
--
-- DO NOT run this against production. Replace every value with genuine
-- business information supplied by the client before going live.
--   psql "$DATABASE_URL" -f supabase/seed.sql
-- ════════════════════════════════════════════════════════════════════════

-- ── Site settings ───────────────────────────────────────────────────────
insert into public.site_settings (key, value) values
  ('brand', jsonb_build_object(
    'business_name', 'Penman Empire',
    'tagline', 'Automobiles. Real estate. Shop.',
    'logo_url', null
  )),
  ('contact', jsonb_build_object(
    'phone', '+234 000 000 0000',
    'whatsapp', '+2340000000000',
    'email', 'hello@penmanempire.com',
    'address', '[DEMO] Business address to be supplied',
    'hours', '[DEMO] Mon–Sat, 9am–6pm'
  )),
  ('social', jsonb_build_object(
    'instagram', 'https://www.instagram.com/penman_autos/',
    'tiktok', 'https://www.tiktok.com/@penman_autos',
    'facebook', '',
    'x', '',
    'linkedin', null
  )),
  ('hero', jsonb_build_object(
    'eyebrow', 'Penman Empire — one brand, three businesses',
    'heading', 'Mobility, property and products',
    'heading_emphasis', 'under one roof.',
    'subheading', '[DEMO] Replace with the client''s genuine hero copy before launch.',
    'primary_cta_label', 'Explore rentals',
    'primary_cta_href', '/rental'
  )),
  ('about', jsonb_build_object(
    'heading', 'Built on trust',
    'body', '[DEMO] The client''s genuine about copy goes here.'
  )),
  ('footer', jsonb_build_object(
    'note', '[DEMO] Footer note to be supplied.'
  )),
  ('seo', jsonb_build_object(
    'default_title', 'Penman Empire — Automobiles, Real Estate & Shop',
    'default_description', '[DEMO] Replace with the client''s genuine SEO description.',
    'keywords', ''
  ))
on conflict (key) do update set value = excluded.value;

-- ── Product categories ──────────────────────────────────────────────────
insert into public.product_categories (slug, name, description, position) values
  ('accessories', 'Accessories', '[DEMO] Category', 1),
  ('car-care', 'Car Care', '[DEMO] Category', 2),
  ('home-living', 'Home & Living', '[DEMO] Category', 3)
on conflict (slug) do nothing;
