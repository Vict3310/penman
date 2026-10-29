/**
 * Replace the named Hugging Face product rows and retire the named everyday
 * model references with a curated, clearly labelled photo catalogue.
 * Other data and stored files stay intact.
 *
 * Run from the repository root with the usual database environment variables:
 *   node --env-file=.env.local scripts/replace-reference-catalogue.mjs
 *
 * The database work is one transaction. User-created inventory is left alone.
 * Source photos remain on their original hosts, with source and licence data
 * stored in each media reference and shown on its detail page.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";
import { connectionOptions } from "./database-ssl.mjs";

const SOURCE = "huggingface:Binaryy/cars-for-sale";
const RETIRED_CAR_SLUGS = [
  "reference-toyota-corolla", "reference-toyota-camry", "reference-toyota-rav4",
  "reference-toyota-hilux", "reference-toyota-sienna",
  "reference-honda-civic", "reference-honda-accord", "reference-honda-cr-v", "reference-honda-pilot",
  "reference-hyundai-tucson", "reference-hyundai-santa-fe",
  "reference-kia-sportage", "reference-kia-sorento",
  "reference-nissan-altima", "reference-nissan-rogue",
];
const manifest = JSON.parse(readFileSync(resolve("data/reference-catalogue.json"), "utf8"));

function assertManifest() {
  if (manifest.cars.length !== 50 || manifest.houses.length !== 12) {
    throw new Error("Expected exactly 50 car references and 12 home references.");
  }
  if (manifest.cars.some((car) => RETIRED_CAR_SLUGS.includes(car.slug))) {
    throw new Error("Retired everyday car references must not be in the manifest.");
  }
  for (const collection of [manifest.cars, manifest.houses]) {
    if (new Set(collection.map((item) => item.slug)).size !== collection.length) {
      throw new Error("Reference slugs must be unique.");
    }
    for (const item of collection) {
      const images = item.images ?? (item.image ? [item.image] : []);
      if (images.length === 0) throw new Error(`Missing images for ${item.slug}.`);
      for (const image of images) {
        if (!image.url?.startsWith("https://") || !image.source_url?.startsWith("https://")) {
          throw new Error(`Missing HTTPS image or source for ${item.slug}.`);
        }
        if (!image.license || !image.license_url) {
          throw new Error(`Missing photo licence for ${item.slug}.`);
        }
      }
    }
  }
}

async function upsert(client, table, columns, values) {
  const params = columns.map((_, index) => `$${index + 1}`).join(", ");
  const updates = columns
    .filter((name) => name !== "slug")
    .map((name) => `${name} = excluded.${name}`)
    .join(", ");
  const result = await client.query(
    `insert into public.${table} (${columns.join(", ")}) values (${params})
     on conflict (slug) do update set ${updates}
     where public.${table}.is_reference = true
     returning id`,
    values,
  );
  if (result.rowCount !== 1) throw new Error(`Slug ${values[0]} belongs to a non-reference listing.`);
}

assertManifest();
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const client = new Client(connectionOptions(process.env));
await client.connect();
let counts;
try {
  await client.query("begin");
  await client.query(readFileSync(resolve("supabase/migrations/0006_reference_showcases.sql"), "utf8"));

  const imported = await client.query("delete from public.products where inventory_source = $1", [SOURCE]);
  const retired = await client.query(
    "delete from public.products where slug = any($1::text[]) and is_reference = true",
    [RETIRED_CAR_SLUGS],
  );

  const category = await client.query(
    `insert into public.product_categories (slug, name, description, position)
     values ('cars', 'Cars', 'Real car model references; stock and price require confirmation.', 0)
     on conflict (slug) do update set name = excluded.name, description = excluded.description
     returning id`,
  );
  const categoryId = category.rows[0].id;
  const publishedAt = new Date().toISOString();

  for (const [index, car] of manifest.cars.entries()) {
    await upsert(client, "products", [
      "slug", "name", "sku", "description", "price", "currency", "category_id",
      "track_stock", "stock_quantity", "availability", "images", "is_featured",
      "is_reference", "status", "published_at", "specs", "seo_title", "seo_description",
    ], [
      car.slug, car.name, `REF-${car.slug}`,
      car.description, null, "NGN", categoryId, false, 0, "unavailable",
      JSON.stringify(car.images ?? [car.image]), index < 3, true, "published", publishedAt,
      JSON.stringify({ make: car.make, model: car.model, body_style: car.body_style }),
      `${car.name} model reference`,
      `${car.body_style} with a real model photograph. Stock and price require confirmation.`,
    ]);
  }

  for (const [index, house] of manifest.houses.entries()) {
    await upsert(client, "properties", [
      "slug", "title", "description", "listing_type", "property_type", "location",
      "address", "price", "price_type", "currency", "bedrooms", "bathrooms",
      "area_sqm", "amenities", "availability", "images", "is_featured",
      "is_reference", "status", "published_at", "seo_title", "seo_description",
    ], [
      house.slug, house.title, house.description, "sale", "house", "Location not supplied",
      null, null, "on_request", "NGN", null, null, null, [], "unverified",
      JSON.stringify(house.images ?? [house.image]), index < 3, true, "published", publishedAt,
      `${house.title} photo reference`,
      "Real architectural photograph for inspiration. Address, price and availability have not been verified.",
    ]);
  }

  const verified = await client.query(
    `select
       (select count(*) from public.products where inventory_source = $1)::int as old_imported,
       (select count(*) from public.products where is_reference)::int as car_references,
       (select count(*) from public.properties where is_reference)::int as home_references`,
    [SOURCE],
  );
  if (verified.rows[0].old_imported !== 0 || verified.rows[0].car_references !== manifest.cars.length ||
      verified.rows[0].home_references !== 12) {
    throw new Error("Post-write catalogue counts did not match expectations.");
  }

  await client.query("commit");
  counts = {
    removed: { importedCars: imported.rowCount, retiredEverydayCars: retired.rowCount },
    published: verified.rows[0],
  };
} catch (error) {
  await client.query("rollback").catch(() => {});
  throw error;
} finally {
  await client.end();
}

console.log(JSON.stringify(counts));
