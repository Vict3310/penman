/**
 * One-time cleanup of the explicitly identified test/demo data and old
 * Hugging Face import artifacts. Safe to rerun after a partial storage failure.
 *
 *   node --env-file=.env.local scripts/cleanup-legacy-catalogue.mjs
 */

import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";
import { connectionOptions } from "./database-ssl.mjs";

const SOURCE = "huggingface:Binaryy/cars-for-sale";
const { DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!DATABASE_URL || !NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Database URL, Supabase URL, and service role key are required.");
}

const client = new Client(connectionOptions(process.env));
await client.connect();
let storagePaths;
let deleted;
try {
  const storage = await client.query(
    "select name from storage.objects where bucket_id = 'media' and name like 'cars/%' order by name",
  );
  storagePaths = storage.rows.map(({ name }) => name);
  const unexpected = storagePaths.filter(
    (path) => !/^cars\/[^/]+\/[0-9a-f]{32}\.(jpg|jpeg|png|webp|avif)$/.test(path),
  );
  if (unexpected.length) throw new Error(`${unexpected.length} storage paths do not match the car import format.`);

  const referenced = await client.query(
    `select
       (select count(*) from public.products where images::text like '%cars/%') +
       (select count(*) from public.properties where images::text like '%cars/%') +
       (select count(*) from public.vehicles where images::text like '%cars/%') as count`,
  );
  if (Number(referenced.rows[0].count) !== 0) {
    throw new Error("A current listing still references an old imported image.");
  }

  await client.query("begin");
  const results = [
    await client.query(
      `delete from public.products
       where (sku like 'PE-TEST-%' and description like 'Sample test product %')
          or (slug like 'demo-%' and name like '[DEMO]%')`,
    ),
    await client.query("delete from public.properties where slug like 'demo-%' and title like '[DEMO]%'"),
    await client.query("delete from public.vehicles where slug like 'demo-%' and name like '[DEMO]%'"),
    await client.query("delete from public.inventory_imports where source = $1", [SOURCE]),
  ];
  deleted = Object.fromEntries(
    ["products", "properties", "vehicles", "importLogs"].map((name, index) => [name, results[index].rowCount]),
  );
  await client.query("commit");
} catch (error) {
  await client.query("rollback").catch(() => {});
  throw error;
} finally {
  await client.end();
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
let removedImages = 0;
for (let index = 0; index < storagePaths.length; index += 100) {
  const paths = storagePaths.slice(index, index + 100);
  const { error } = await supabase.storage.from("media").remove(paths);
  if (error) throw new Error(`Removed ${removedImages} images; next batch failed: ${error.message}`);
  removedImages += paths.length;
  console.log(`Removed ${removedImages}/${storagePaths.length} old imported images`);
}

console.log(JSON.stringify({ deleted, removedImages }));
