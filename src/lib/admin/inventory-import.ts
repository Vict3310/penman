import { getAdminClient } from "@/lib/supabase/admin";
import type { Product } from "@/lib/types";

/**
 * Administrative reads for imported inventory.
 *
 * These use the service-role client, like every other module on this path, so
 * every caller MUST have checked `requireAdminPage()` first. The values are
 * operational — how much inventory was imported, what the last run did, which
 * drafts are waiting for a decision — and none of it is public.
 *
 * The importer writes `inventory_imports` (migration 0005); this module only
 * reads it. Nothing here changes a listing: publication belongs to
 * setImportedListingStatus() in src/app/actions/imports.ts.
 */

export interface ImportRun {
  id: string;
  source: string;
  mode: "dry-run" | "run";
  dataset_revision: string | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  records_seen: number;
  inserted: number;
  updated: number;
  skipped: number;
  rejected: number;
  published: number;
  images_stored: number;
  images_reused: number;
  images_failed: number;
  summary: Record<string, unknown> | null;
  report: { rejections?: unknown[]; problems?: unknown[] } | null;
}

export interface ImportedInventoryOverview {
  total: number;
  draft: number;
  published: number;
  archived: number;
  withoutImage: number;
  sources: { source: string; count: number }[];
  lastRun: ImportRun | null;
  lastDryRun: ImportRun | null;
}

const IMPORT_COLUMNS =
  "id, source, mode, dataset_revision, started_at, finished_at, duration_ms, records_seen, inserted, updated, skipped, rejected, published, images_stored, images_reused, images_failed, summary, report";

const EMPTY: ImportedInventoryOverview = {
  total: 0, draft: 0, published: 0, archived: 0, withoutImage: 0,
  sources: [], lastRun: null, lastDryRun: null,
};

export async function adminImportedInventoryOverview(): Promise<ImportedInventoryOverview> {
  try {
    const supabase = getAdminClient();
    const imported = () => supabase.from("products").select("id", { count: "exact", head: true }).not("inventory_source", "is", null);

    const [total, draft, published, archived, missingImages, runs, sources] = await Promise.all([
      imported(),
      imported().eq("status", "draft"),
      imported().eq("status", "published"),
      imported().eq("status", "archived"),
      // `image_stored` is written by the importer, so this counts listings the
      // importer knows it stored no picture for. A count query, not a fetch.
      imported().eq("specs->>image_stored", "false"),
      supabase.from("inventory_imports").select(IMPORT_COLUMNS).order("started_at", { ascending: false }).limit(20),
      supabase.from("products").select("inventory_source").not("inventory_source", "is", null).limit(5000),
    ]);

    const runsList = (runs.data ?? []) as ImportRun[];
    const bySource = new Map<string, number>();
    for (const row of (sources.data ?? []) as { inventory_source: string | null }[]) {
      if (!row.inventory_source) continue;
      bySource.set(row.inventory_source, (bySource.get(row.inventory_source) ?? 0) + 1);
    }

    return {
      total: total.count ?? 0,
      draft: draft.count ?? 0,
      published: published.count ?? 0,
      archived: archived.count ?? 0,
      withoutImage: missingImages.count ?? 0,
      sources: [...bySource.entries()]
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count),
      lastRun: runsList.find((run) => run.mode === "run") ?? null,
      lastDryRun: runsList.find((run) => run.mode === "dry-run") ?? null,
    };
  } catch {
    // An unreachable database renders the screen with its instructions and
    // zeroes, rather than throwing a 500 inside the admin panel.
    return EMPTY;
  }
}

/**
 * The imported listings an administrator has to decide about: drafts first,
 * since those are the ones waiting, newest first within that. `limit` keeps the
 * screen a bounded queue rather than a report of all 1,332 rows.
 */
export async function adminListImportedProducts(limit = 25): Promise<Product[]> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select("id, slug, name, price, currency, status, availability, images, specs, source_id, source_url, inventory_source, imported_at, created_at")
      .not("inventory_source", "is", null)
      .order("imported_at", { ascending: false })
      .limit(limit);
    if (error) return [];

    return ((data ?? []) as Product[]).sort((a, b) => {
      if (a.status === b.status) return 0;
      if (a.status === "draft") return -1;
      if (b.status === "draft") return 1;
      return a.status === "published" ? -1 : 1;
    });
  } catch {
    return [];
  }
}
