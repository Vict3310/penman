import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";
import { maybePublicClient } from "@/lib/supabase/public";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();

  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/rental`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/real-estate`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/shop`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const supabase = maybePublicClient();
  if (!supabase) return entries;

  try {
    const [vehicles, properties, products] = await Promise.all([
      supabase.from("vehicles").select("slug, updated_at").eq("status", "published"),
      supabase.from("properties").select("slug, updated_at").eq("status", "published"),
      supabase.from("products").select("slug, updated_at").eq("status", "published"),
    ]);

    for (const row of (vehicles.data ?? []) as { slug: string; updated_at: string }[]) {
      entries.push({
        url: `${base}/rental/${row.slug}`,
        lastModified: row.updated_at,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
    for (const row of (properties.data ?? []) as { slug: string; updated_at: string }[]) {
      entries.push({
        url: `${base}/real-estate/${row.slug}`,
        lastModified: row.updated_at,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
    for (const row of (products.data ?? []) as { slug: string; updated_at: string }[]) {
      entries.push({
        url: `${base}/shop/${row.slug}`,
        lastModified: row.updated_at,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch {
    // Fall back to the static routes when the database is unreachable.
  }

  return entries;
}
