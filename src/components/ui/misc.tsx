import Link from "next/link";
import { cn } from "@/lib/utils";

/* ── Badge ───────────────────────────────────────────────────────────── */

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "amber" | "red" | "blue";
  className?: string;
}) {
  const tones = {
    neutral: "border-black/15 bg-white/70 text-black/60",
    green: "border-forest/20 bg-sage text-forest",
    amber: "border-amber-500/30 bg-amber-50 text-amber-800",
    red: "border-red-500/30 bg-red-50 text-red-700",
    blue: "border-blue-500/30 bg-blue-50 text-blue-700",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ── Status badge (shared vocabulary across all modules) ─────────────── */

const STATUS_TONES: Record<string, "neutral" | "green" | "amber" | "red" | "blue"> = {
  // publish
  draft: "neutral",
  published: "green",
  archived: "neutral",
  // enquiry
  new: "blue",
  contacted: "amber",
  confirmed: "green",
  declined: "red",
  closed: "neutral",
  fulfilled: "green",
  cancelled: "red",
  // availability
  available: "green",
  unavailable: "neutral",
  maintenance: "amber",
  reserved: "amber",
  sold: "red",
  let: "red",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <Badge tone={STATUS_TONES[status] ?? "neutral"} className={className}>
      {label}
    </Badge>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────── */

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="card-surface flex flex-col items-center gap-4 px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-sage text-lg text-forest">∅</span>
      <div>
        <p className="font-display text-lg tracking-tight">{title}</p>
        {description && <p className="mx-auto mt-2 max-w-md text-sm text-black/50">{description}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/5"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

/* ── Pagination ──────────────────────────────────────────────────────── */

export function Pagination({
  page,
  pageCount,
  buildHref,
}: {
  page: number;
  pageCount: number;
  buildHref: (page: number) => string;
}) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1,
  );

  return (
    <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Pagination">
      {page > 1 && (
        <Link href={buildHref(page - 1)} className="btn-ghost" rel="prev">
          Previous
        </Link>
      )}
      <span className="flex items-center gap-1">
        {pages.map((p, i) => {
          const prev = pages[i - 1];
          const gap = prev !== undefined && p - prev > 1;
          return (
            <span key={p} className="flex items-center gap-1">
              {gap && <span className="px-1 text-black/30">…</span>}
              <Link
                href={buildHref(p)}
                aria-current={p === page ? "page" : undefined}
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-full text-sm transition-colors",
                  p === page ? "bg-forest text-white" : "border border-black/10 bg-white hover:bg-black/5",
                )}
              >
                {p}
              </Link>
            </span>
          );
        })}
      </span>
      {page < pageCount && (
        <Link href={buildHref(page + 1)} className="btn-ghost" rel="next">
          Next
        </Link>
      )}
    </nav>
  );
}
