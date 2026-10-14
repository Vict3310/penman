import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

function readEnvLocal() {
  const filePath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(filePath)) return {};

  const result = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = line.slice(0, equalsIndex).trim();
    const rawValue = line.slice(equalsIndex + 1).trim();
    result[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
  return result;
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `item-${Math.random().toString(36).slice(2, 8)}`;
}

function createProductName(index) {
  const prefixes = [
    "Premium",
    "Executive",
    "Urban",
    "Compact",
    "Luxury",
    "Travel",
    "Pro",
    "Everyday",
    "Heritage",
    "Classic",
  ];
  const suffixes = [
    "Seat Organizer",
    "Dash Mat",
    "Car Care Kit",
    "Storage Box",
    "Portable Charger",
    "Travel Tote",
    "Home Organizer",
    "Safety Kit",
    "Air Purifier",
    "Smart Lamp",
    "Coffee Set",
    "Desk Tray",
    "Leather Wallet",
    "Utility Basket",
    "Charging Dock",
  ];

  const prefix = prefixes[index % prefixes.length];
  const suffix = suffixes[(index * 3) % suffixes.length];
  return `${prefix} ${suffix}`;
}

async function main() {
  const env = { ...process.env, ...readEnvLocal() };
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing. Add it to .env.local or your shell environment.");
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  const categories = [
    { slug: "accessories", name: "Accessories" },
    { slug: "car-care", name: "Car Care" },
    { slug: "home-living", name: "Home & Living" },
  ];

  for (const category of categories) {
    await client.query(
      `INSERT INTO public.product_categories (slug, name, description, position)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name`,
      [category.slug, category.name, "[TEST] Auto-seeded sample category", 1],
    );
  }

  const categoryRows = await client.query(
    `SELECT id, slug FROM public.product_categories WHERE slug = ANY ($1) ORDER BY position`,
    [categories.map((entry) => entry.slug)],
  );

  const categoryMap = new Map(categoryRows.rows.map((row) => [row.slug, row.id]));
  const inserted = [];

  for (let index = 1; index <= 100; index += 1) {
    const name = createProductName(index);
    const slug = `${slugify(name)}-${index}`;
    const categorySlug = categories[(index - 1) % categories.length].slug;
    const categoryId = categoryMap.get(categorySlug);
    const price = (index * 1975 + 18000) / 100;
    const quantity = (index * 7) % 41 + 2;
    const isFeatured = index % 6 === 0;
    const description = `Sample product ${index} for the storefront. This is a test listing created to populate the project with realistic catalog content.`;
    const images = [
      {
        path: `products/test-${index}/1.jpg`,
        url: `https://picsum.photos/seed/penman-product-${index}/1000/1000`,
        alt: `${name} product image`,
      },
    ];

    inserted.push({
      slug,
      name,
      sku: `TEST-${String(index).padStart(4, "0")}`,
      description,
      price,
      categoryId,
      quantity,
      isFeatured,
      images,
      seoTitle: `${name} | Penman Empire`,
      seoDescription: description,
    });
  }

  for (const product of inserted) {
    await client.query(
      `INSERT INTO public.products (
        slug,
        name,
        sku,
        description,
        price,
        currency,
        category_id,
        track_stock,
        stock_quantity,
        availability,
        images,
        is_featured,
        status,
        seo_title,
        seo_description,
        published_at
      ) VALUES (
        $1, $2, $3, $4, $5, 'NGN', $6, true, $7, 'available', $8::jsonb, $9, 'published', $10, $11, NOW()
      ) ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        category_id = EXCLUDED.category_id,
        stock_quantity = EXCLUDED.stock_quantity,
        images = EXCLUDED.images,
        is_featured = EXCLUDED.is_featured,
        status = EXCLUDED.status,
        seo_title = EXCLUDED.seo_title,
        seo_description = EXCLUDED.seo_description,
        updated_at = NOW()`,
      [
        product.slug,
        product.name,
        product.sku,
        product.description,
        product.price,
        product.categoryId,
        product.quantity,
        JSON.stringify(product.images),
        product.isFeatured,
        product.seoTitle,
        product.seoDescription,
      ],
    );
  }

  const count = await client.query("SELECT COUNT(*)::int AS total FROM public.products");
  console.log(`Seeded ${count.rows[0].total} products total.`);

  await client.end();
}

main().catch((error) => {
  console.error("Failed to seed test products:", error);
  process.exitCode = 1;
});
