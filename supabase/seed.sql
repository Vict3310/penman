-- ════════════════════════════════════════════════════════════════════════
-- Penman Empire — DEVELOPMENT SEED
-- ────────────────────────────────────────────────────────────────────────
-- ⚠️  DEMONSTRATION DATA ONLY.
-- Every record below is prefixed with "[DEMO]" and uses placeholder
-- imagery. This file is for local development and staging so the admin
-- dashboard is not empty while it is being built.
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
    'instagram', '',
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

-- ── Vehicles ────────────────────────────────────────────────────────────
insert into public.vehicles
  (slug, name, category, description, rate, rate_period, seats, doors, transmission, fuel_type, year, availability, rental_terms, images, is_featured, status, seo_title, seo_description, published_at)
values
  (
    'demo-toyota-corolla-2022', '[DEMO] Toyota Corolla 2022', 'Sedan',
    '[DEMO] Placeholder description. A dependable, fuel-efficient sedan for city and intercity travel.',
    45000, 'day', 5, 4, 'automatic', 'petrol', 2022, 'available',
    '[DEMO] Valid ID and a refundable deposit are required. Fuel is not included.',
    jsonb_build_array(
      jsonb_build_object('path', 'vehicles/demo-toyota-corolla-2022/1.jpg', 'url', 'https://picsum.photos/seed/pe-car-1/1200/800', 'alt', '[DEMO] Vehicle photograph'),
      jsonb_build_object('path', 'vehicles/demo-toyota-corolla-2022/2.jpg', 'url', 'https://picsum.photos/seed/pe-car-2/1200/800', 'alt', '[DEMO] Vehicle photograph')
    ),
    true, 'published', '[DEMO] Toyota Corolla 2022 for hire', '[DEMO] Placeholder SEO description.',
    now()
  ),
  (
    'demo-toyota-hiace-bus', '[DEMO] Toyota Hiace Bus', 'Bus',
    '[DEMO] Placeholder description. A 14-seater bus suited to group and staff movement.',
    85000, 'day', 14, 5, 'manual', 'diesel', 2019, 'available',
    '[DEMO] Driver available on request.',
    jsonb_build_array(
      jsonb_build_object('path', 'vehicles/demo-toyota-hiace-bus/1.jpg', 'url', 'https://picsum.photos/seed/pe-car-3/1200/800', 'alt', '[DEMO] Vehicle photograph')
    ),
    true, 'published', '[DEMO] Toyota Hiace Bus for hire', '[DEMO] Placeholder SEO description.',
    now()
  ),
  (
    'demo-toyota-highlander', '[DEMO] Toyota Highlander', 'SUV',
    '[DEMO] Placeholder description. A spacious SUV for family and executive travel.',
    120000, 'day', 7, 5, 'automatic', 'petrol', 2021, 'maintenance',
    '[DEMO] Currently off the road for scheduled servicing.',
    jsonb_build_array(
      jsonb_build_object('path', 'vehicles/demo-toyota-highlander/1.jpg', 'url', 'https://picsum.photos/seed/pe-car-4/1200/800', 'alt', '[DEMO] Vehicle photograph')
    ),
    false, 'published', '[DEMO] Toyota Highlander for hire', '[DEMO] Placeholder SEO description.',
    now()
  )
on conflict (slug) do nothing;

-- ── Properties ──────────────────────────────────────────────────────────
insert into public.properties
  (slug, title, description, listing_type, property_type, location, address, price, price_type, bedrooms, bathrooms, area_sqm, amenities, availability, contact_phone, images, is_featured, status, seo_title, seo_description, published_at)
values
  (
    'demo-3-bedroom-terrace', '[DEMO] 3-Bedroom Terrace Duplex', '[DEMO] Placeholder description for a modern terrace duplex.',
    'sale', 'duplex', '[DEMO] Sample District', '[DEMO] Sample address line',
    85000000, 'negotiable', 3, 4, 220, array['[DEMO] Fitted kitchen', '[DEMO] Borehole', '[DEMO] 24/7 power'],
    'available', '+2340000000000',
    jsonb_build_array(
      jsonb_build_object('path', 'properties/demo-3-bedroom-terrace/1.jpg', 'url', 'https://picsum.photos/seed/pe-prop-1/1200/800', 'alt', '[DEMO] Property photograph'),
      jsonb_build_object('path', 'properties/demo-3-bedroom-terrace/2.jpg', 'url', 'https://picsum.photos/seed/pe-prop-2/1200/800', 'alt', '[DEMO] Property photograph')
    ),
    true, 'published', '[DEMO] 3-Bedroom Terrace Duplex', '[DEMO] Placeholder SEO description.', now()
  ),
  (
    'demo-2-bedroom-apartment-let', '[DEMO] 2-Bedroom Apartment (Annual Let)', '[DEMO] Placeholder description for an apartment available to let.',
    'rent', 'apartment', '[DEMO] Sample District', '[DEMO] Sample address line',
    4500000, 'fixed', 2, 2, 110, array['[DEMO] Serviced', '[DEMO] Parking'],
    'available', '+2340000000000',
    jsonb_build_array(
      jsonb_build_object('path', 'properties/demo-2-bedroom-apartment-let/1.jpg', 'url', 'https://picsum.photos/seed/pe-prop-3/1200/800', 'alt', '[DEMO] Property photograph')
    ),
    true, 'published', '[DEMO] 2-Bedroom Apartment to let', '[DEMO] Placeholder SEO description.', now()
  ),
  (
    'demo-commercial-plot', '[DEMO] Commercial Plot', '[DEMO] Placeholder description for a commercial land parcel.',
    'sale', 'land', '[DEMO] Sample District', null,
    null, 'on_request', null, null, 1000, array['[DEMO] Fenced', '[DEMO] Title documents'],
    'available', null,
    jsonb_build_array(
      jsonb_build_object('path', 'properties/demo-commercial-plot/1.jpg', 'url', 'https://picsum.photos/seed/pe-prop-4/1200/800', 'alt', '[DEMO] Property photograph')
    ),
    false, 'published', '[DEMO] Commercial Plot', '[DEMO] Placeholder SEO description.', now()
  )
on conflict (slug) do nothing;

-- ── Products ────────────────────────────────────────────────────────────
insert into public.products
  (slug, name, sku, description, price, category_id, track_stock, stock_quantity, images, is_featured, status, seo_title, seo_description, published_at)
select
  v.slug, v.name, v.sku, v.description, v.price,
  (select id from public.product_categories c where c.slug = v.category_slug),
  v.track_stock, v.stock_quantity, v.images, v.is_featured, 'published',
  v.seo_title, v.seo_description, now()
from (values
  (
    'demo-penman-car-care-kit', '[DEMO] Car Care Kit', 'PE-DEMO-001',
    '[DEMO] Placeholder description for a bundled car care kit.',
    25000::numeric, 'car-care', true, 20,
    jsonb_build_array(
      jsonb_build_object('path', 'products/demo-penman-car-care-kit/1.jpg', 'url', 'https://picsum.photos/seed/pe-prod-1/1000/1000', 'alt', '[DEMO] Product photograph')
    ),
    true, '[DEMO] Car Care Kit', '[DEMO] Placeholder SEO description.'
  ),
  (
    'demo-dash-camera', '[DEMO] Dash Camera', 'PE-DEMO-002',
    '[DEMO] Placeholder description for a dash camera.',
    68000::numeric, 'accessories', true, 12,
    jsonb_build_array(
      jsonb_build_object('path', 'products/demo-dash-camera/1.jpg', 'url', 'https://picsum.photos/seed/pe-prod-2/1000/1000', 'alt', '[DEMO] Product photograph')
    ),
    true, '[DEMO] Dash Camera', '[DEMO] Placeholder SEO description.'
  ),
  (
    'demo-home-water-dispenser', '[DEMO] Home Water Dispenser', 'PE-DEMO-003',
    '[DEMO] Placeholder description for a home water dispenser.',
    95000::numeric, 'home-living', false, 0,
    jsonb_build_array(
      jsonb_build_object('path', 'products/demo-home-water-dispenser/1.jpg', 'url', 'https://picsum.photos/seed/pe-prod-3/1000/1000', 'alt', '[DEMO] Product photograph')
    ),
    false, '[DEMO] Home Water Dispenser', '[DEMO] Placeholder SEO description.'
  )
) as v(slug, name, sku, description, price, category_slug, track_stock, stock_quantity, images, is_featured, seo_title, seo_description)
on conflict (slug) do nothing;

-- ── 100-storefront test products (generated) ─────────────────────────────
insert into public.products
  (slug, name, sku, description, price, category_id, track_stock, stock_quantity, images, is_featured, status, seo_title, seo_description, published_at)
with numbered_products as (
  select
    gs as idx,
    case gs % 3
      when 1 then 'accessories'
      when 2 then 'car-care'
      else 'home-living'
    end as category_slug,
    case gs % 10
      when 0 then 'Premium'
      when 1 then 'Executive'
      when 2 then 'Urban'
      when 3 then 'Luxury'
      when 4 then 'Compact'
      when 5 then 'Travel'
      when 6 then 'Classic'
      when 7 then 'Modern'
      when 8 then 'Smart'
      else 'Everyday'
    end as prefix,
    case gs % 12
      when 0 then 'Seat Organizer'
      when 1 then 'Dash Mat'
      when 2 then 'Car Care Kit'
      when 3 then 'Storage Box'
      when 4 then 'Charging Dock'
      when 5 then 'Travel Tote'
      when 6 then 'Air Purifier'
      when 7 then 'Coffee Set'
      when 8 then 'Desk Tray'
      when 9 then 'Safety Kit'
      when 10 then 'Utility Basket'
      else 'Home Organizer'
    end as suffix
  from generate_series(1, 100) as gs
)
select
  concat(lower(regexp_replace(concat(prefix, ' ', suffix), '[^a-z0-9]+', '-', 'g')), '-', idx),
  concat(prefix, ' ', suffix),
  concat('PE-TEST-', lpad(idx::text, 4, '0')),
  concat('Sample test product ', idx, ' for the storefront, created to populate the catalog with realistic inventory. '),
  ((idx * 1975) + 18000)::numeric / 100.0,
  (select id from public.product_categories where slug = category_slug),
  true,
  ((idx * 7) % 41) + 2,
  jsonb_build_array(
    jsonb_build_object(
      'path', concat('products/test-', idx, '/1.jpg'),
      'url', concat('https://picsum.photos/seed/penman-product-', idx, '/1000/1000'),
      'alt', concat(prefix, ' ', suffix)
    )
  ),
  idx % 6 = 0,
  'published',
  concat(prefix, ' ', suffix, ' | Penman Empire'),
  concat('Sample test product ', idx, ' created for storefront and admin testing.'),
  now()
from numbered_products
on conflict (slug) do nothing;
