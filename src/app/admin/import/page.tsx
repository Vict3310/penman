import Link from "next/link";
import { AlertTriangle, ExternalLink, Images, ShieldAlert } from "lucide-react";

import { AdminPageHeader, ConfirmForm, StatCard } from "@/components/admin/ui";
import { Badge, EmptyState, StatusBadge } from "@/components/ui/misc";
import { setImportedListingStatus } from "@/app/actions/imports";
import {
  adminImportedInventoryOverview,
  adminListImportedProducts,
  type ImportRun,
} from "@/lib/admin/inventory-import";
import { formatCurrency, formatDateTime, formatMileage } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Review screen for imported inventory.
 *
 * This exists because of one decision made in the importer: imported listings
 * arrive as drafts. Nothing that came from a dataset is visible to a customer
 * until somebody here has looked at it and said so, which is what keeps a
 * historic marketplace listing from being mistaken for Penman Empire stock.
 *
 * The page is read-only apart from publish/unpublish. Re-running the import is
 * a server-side CLI job — it downloads a dataset, writes over a thousand rows
 * and uploads images, none of which belongs in a page request.
 */
export default async function InventoryImportPage() {
  const [overview, queue] = await Promise.all([
    adminImportedInventoryOverview(),
    adminListImportedProducts(25),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Inventory import"
        description="Cars imported from an external dataset. They stay invisible to customers until you publish them, and they are always marked as imported listings."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Imported listings"
          value={overview.total}
          hint={overview.sources[0] ? overview.sources[0].source : "Nothing imported yet"}
          tone={overview.total > 0 ? "accent" : "default"}
        />
        <StatCard label="Awaiting review" value={overview.draft} hint="Draft — not on the site" />
        <StatCard label="Published" value={overview.published} hint="Visible in the catalogue" />
        <StatCard
          label="Without a picture"
          value={overview.withoutImage}
          hint="Cards fall back to a placeholder"
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <RunPanel run={overview.lastRun} title="Last import run" />
        <RunPanel run={overview.lastDryRun} title="Last dry run" />
      </div>

      <section className="card-surface mt-8 p-6">
        <h2 className="font-display text-lg font-light tracking-tight">Run an import</h2>
        <p className="mt-2 max-w-3xl text-sm text-black/50">
          Importing runs on the server that can reach the database and the media bucket, so it is a
          command rather than a button. A dry run reports what would change and writes no products.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-ink/95 p-4 text-xs leading-relaxed text-white/90">
{`# report only — nothing is written
npm run cars:import -- --dry-run

# a small first batch, held as drafts
npm run cars:import -- --limit 12

# everything, still as drafts for review here
npm run cars:import

# publish as it imports (skips the review step)
npm run cars:import -- --publish`}
        </pre>
        <p className="mt-4 flex items-start gap-2 text-xs text-black/50">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest" strokeWidth={1.5} />
          Hand-curated listings are never touched. The importer only ever writes rows whose source is
          the dataset, never deletes anything, and leaves alone any imported row that has been edited
          here afterwards.
        </p>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-light tracking-tight">Waiting for review</h2>
            <p className="mt-1 text-sm text-black/50">
              The {queue.length === 25 ? "first 25" : `first ${queue.length}`} imported listings, drafts
              first. Publishing puts one in the cars-for-sale catalogue with its source price and an
              &ldquo;imported&rdquo; label.
            </p>
          </div>
        </div>

        {queue.length === 0 ? (
          <EmptyState
            title="No imported inventory yet"
            description="Run the importer on the server, then come back here to review what it brought in."
          />
        ) : (
          <div className="card-surface divide-y divide-black/5">
            {queue.map((product) => {
              const specs = product.specs ?? {};
              const mileage = formatMileage(specs.mileage_km);
              return (
                <div key={product.id} className="flex flex-wrap items-start justify-between gap-4 p-4">
                  <div className="flex min-w-0 flex-1 gap-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-sage/60">
                      {product.images?.[0]?.url ? (
                        // A plain <img>: this is an admin thumbnail of a 6 KB
                        // object that is already in our own storage, and the
                        // optimiser would add nothing but a round trip.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.images[0].url}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-black/30">
                          <Images className="h-4 w-4" strokeWidth={1.5} />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{product.name}</p>
                        <StatusBadge status={product.status} />
                        <Badge tone="amber">Imported</Badge>
                      </div>
                      <p className="mt-1 text-sm text-black/60">
                        {formatCurrency(product.price, product.currency)}
                        <span className="text-black/35"> · {specs.source_price_raw ?? "no raw price"} · source price</span>
                      </p>
                      <p className="mt-1 text-xs text-black/40">
                        {[
                          specs.year ? `Year ${specs.year}` : null,
                          mileage,
                          specs.condition_label,
                          specs.region,
                          product.source_id ? `source ${product.source_id}` : null,
                          specs.source_row_index !== undefined && specs.source_row_index !== null ? `row ${specs.source_row_index}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {specs.image_problem && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-700">
                          <AlertTriangle className="h-3 w-3" strokeWidth={1.5} />
                          Image not stored: {specs.image_problem}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-black/30">
                        Imported {formatDateTime(product.imported_at)} · {product.inventory_source}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {product.status === "published" && (
                      <Link
                        href={`/shop/${product.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs transition-colors hover:bg-black/5"
                      >
                        <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                        View
                      </Link>
                    )}
                    <ConfirmForm
                      action={setImportedListingStatus}
                      hidden={{ id: product.id, publish: product.status === "published" ? "false" : "true" }}
                      confirmMessage={
                        product.status === "published"
                          ? "Remove this imported listing from the catalogue?"
                          : "Publish this imported listing to the cars-for-sale catalogue?"
                      }
                    >
                      {product.status === "published" ? "Unpublish" : "Publish"}
                    </ConfirmForm>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card-surface mt-8 p-6">
        <h2 className="font-display text-lg font-light tracking-tight">About this dataset</h2>
        <ul className="mt-3 space-y-2 text-sm text-black/55">
          <li>
            Source: Hugging Face dataset <code className="text-ink">Binaryy/cars-for-sale</code> — 1,332
            for-sale listings with price, mileage and condition.
          </li>
          <li>
            The dataset declares no licence, and its photographs originate from a third-party Nigerian
            marketplace. Confirm the rights before publishing imported listings publicly.
          </li>
          <li>
            Imported prices and conditions are the source&rsquo;s, never verified here. Nothing imported
            is ever shown as available for hire, and no imported car is added to the rental fleet.
          </li>
        </ul>
      </section>
    </>
  );
}

/** One import run, or the note that there was not one. */
function RunPanel({ run, title }: { run: ImportRun | null; title: string }) {
  if (!run) {
    return (
      <section className="card-surface p-6">
        <h2 className="font-display text-lg font-light tracking-tight">{title}</h2>
        <p className="mt-2 text-sm text-black/50">No run recorded yet.</p>
      </section>
    );
  }

  const buckets = Object.entries(run.summary ?? {}).filter(
    ([key, value]) => key !== "options" && value && typeof value === "object",
  ) as [string, Record<string, number>][];

  return (
    <section className="card-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-light tracking-tight">{title}</h2>
        <Badge tone={run.mode === "dry-run" ? "neutral" : "green"}>{run.mode === "dry-run" ? "Dry run" : "Live"}</Badge>
      </div>

      <p className="mt-2 text-xs text-black/40">
        {formatDateTime(run.started_at)}
        {run.duration_ms !== null ? ` · ${(run.duration_ms / 1000).toFixed(1)}s` : ""}
        {run.dataset_revision ? ` · dataset ${run.dataset_revision.slice(0, 20)}` : ""}
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        {[
          ["Read", run.records_seen],
          ["Inserted", run.inserted],
          ["Updated", run.updated],
          ["Skipped", run.skipped],
          ["Rejected", run.rejected],
          ["Images stored", run.images_stored],
          ["Images reused", run.images_reused],
          ["Images failed", run.images_failed],
          ["Published", run.published],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <dt className="text-xs uppercase tracking-widest text-black/40">{label}</dt>
            <dd className="mt-1 text-lg">{String(value)}</dd>
          </div>
        ))}
      </dl>

      {buckets.length > 0 && (
        <div className="mt-5 space-y-2 border-t border-black/10 pt-4 text-xs text-black/50">
          {buckets.map(([bucket, detail]) => (
            <p key={bucket}>
              <span className="text-black/40">{bucket}:</span>{" "}
              {Object.entries(detail)
                .map(([reason, count]) => `${reason} = ${count}`)
                .join(", ")}
            </p>
          ))}
        </div>
      )}

      {(run.report?.rejections?.length ?? 0) > 0 && (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          {run.report?.rejections?.length} rejection sample(s) recorded — see the run log under
          <code className="mx-1">.cache/cars-import/logs/</code>for the details.
        </p>
      )}
    </section>
  );
}
