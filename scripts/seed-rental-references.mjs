/** Publish rental model references using the licensed car photos in the curated catalogue. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";
import { connectionOptions } from "./database-ssl.mjs";

const slugs = [
  "reference-mercedes-c-300",
  "reference-mercedes-glc-300",
  "reference-mercedes-gle-450",
  "reference-bmw-x5",
  "reference-range-rover-sport",
  "reference-lexus-rx-350",
];
const cars = JSON.parse(readFileSync(resolve("data/reference-catalogue.json"), "utf8")).cars;
const selected = slugs.map((slug) => {
  const car = cars.find((item) => item.slug === slug);
  if (!car || !(car.images?.length || car.image)) throw new Error(`Missing curated media: ${slug}`);
  return { ...car, images: car.images ?? [car.image] };
});
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const client = new Client(connectionOptions(process.env));
await client.connect();
try {
  await client.query("begin");
  for (const [index, car] of selected.entries()) {
    const rentalSlug = `rental-${car.slug}`;
    const result = await client.query(
      `insert into public.vehicles
       (slug, name, category, description, rate, rate_period, currency, seats, doors,
        transmission, fuel_type, year, availability, rental_terms, images, is_featured,
        is_reference, status, published_at, seo_title, seo_description)
       values ($1,$2,$3,$4,null,'day','NGN',null,null,null,null,null,'unavailable',null,$5,$6,true,'published',now(),$7,$8)
       on conflict (slug) do update set
         name=excluded.name, category=excluded.category, description=excluded.description,
         images=excluded.images, is_featured=excluded.is_featured, seo_title=excluded.seo_title,
         seo_description=excluded.seo_description
       where public.vehicles.is_reference = true
       returning id`,
      [rentalSlug, car.name, car.body_style.includes("SUV") ? "Luxury SUV" : "Luxury sedan",
       `The photographs show a real ${car.name} model. This is a rental style reference, not a confirmed Penman Empire fleet unit. Tell us your dates and the team will confirm a specific available car, its condition and rate.`,
       JSON.stringify(car.images), index < 3,
       `${car.name} rental model reference`, `Explore this ${car.name} rental style with real photography. Availability and rate require confirmation.`],
    );
    if (result.rowCount !== 1) throw new Error(`Slug belongs to a non-reference vehicle: ${rentalSlug}`);
  }
  await client.query("commit");
  console.log(`Published ${selected.length} rental model references.`);
} catch (error) {
  await client.query("rollback").catch(() => {});
  throw error;
} finally {
  await client.end();
}
