import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { relativeTime } from "@/lib/account/profile";
import type { AccountActivity } from "@/lib/account/queries";
import { StatusBadge } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

/**
 * Presentational pieces shared across the account area.
 *
 * Server components, with no state and no data access of their own: every one
 * takes what it displays as a prop. That keeps the pages readable and means a
 * change to how a summary card looks cannot accidentally change what it
 * counts.
 */

/* ── Page header ─────────────────────────────────────────────────────── */

export function AccountPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 font-display text-3xl font-light tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        {description && <p className="mt-3 max-w-2xl text-sm text-black/55">{description}</p>}
      </div>
      {action && (
        <Link href={action.href} className="btn-ghost shrink-0">
          {action.label}
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      )}
    </header>
  );
}

/* ── Summary card ────────────────────────────────────────────────────── */

export function SummaryCard({
  label,
  value,
  hint,
  href,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  accent?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.2em] text-black/45">{label}</p>
        <span
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-full",
            accent ? "bg-forest text-white" : "bg-sage text-forest",
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.5} />
        </span>
      </div>
      <p className="mt-4 font-display text-3xl font-light tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-2 text-xs leading-relaxed text-black/50">{hint}</p>}
    </>
  );

  if (!href) {
    return <div className="card-surface p-5">{body}</div>;
  }

  return (
    <Link
      href={href}
      className="card-surface group block p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(18,40,26,0.1)]"
    >
      {body}
    </Link>
  );
}

/* ── Panel ───────────────────────────────────────────────────────────── */

export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("card-surface p-5 sm:p-6", className)}>
      {(title || action) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          {title && (
            <div className="min-w-0">
              <h2 className="font-display text-xl font-light tracking-tight text-ink">{title}</h2>
              {description && <p className="mt-1.5 text-sm text-black/50">{description}</p>}
            </div>
          )}
          {action && (
            <Link
              href={action.href}
              className="shrink-0 text-sm font-medium text-forest underline decoration-forest/30 underline-offset-4 transition-colors hover:decoration-forest"
            >
              {action.label}
            </Link>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

/* ── Activity ────────────────────────────────────────────────────────── */

export function ActivityTimeline({ items }: { items: AccountActivity[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/15 px-5 py-10 text-center">
        <p className="text-sm text-black/55">Nothing here yet.</p>
        <p className="mx-auto mt-1.5 max-w-sm text-xs text-black/45">
          Enquiries you send and listings you save will show up here.
        </p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-5 border-l border-black/10 pl-5">
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span
            aria-hidden="true"
            className="absolute -left-[1.65rem] top-1.5 h-2 w-2 rounded-full bg-forest ring-4 ring-cream"
          />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <p className="text-sm text-ink">
              {item.href ? (
                <Link href={item.href} className="underline decoration-black/15 underline-offset-4 hover:decoration-forest">
                  {item.title}
                </Link>
              ) : (
                item.title
              )}
            </p>
            {item.status && <StatusBadge status={item.status} className="scale-90" />}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-black/45">
            <span>{item.kind}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={item.createdAt}>{relativeTime(item.createdAt)}</time>
            {item.detail && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[11px] tracking-wide">{item.detail}</span>
              </>
            )}
          </p>
        </li>
      ))}
    </ol>
  );
}

/* ── Setting row ─────────────────────────────────────────────────────── */

/** A label/value row used on the profile, security and enquiry detail views. */
export function DetailRow({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-2.5", className)}>
      <dt className="text-xs uppercase tracking-widest text-black/40">{label}</dt>
      <dd className="text-right text-sm text-ink">{value}</dd>
    </div>
  );
}

/* ── Progress ────────────────────────────────────────────────────────── */

export function CompletionMeter({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-black/10"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Profile ${clamped} percent complete`}
    >
      <div
        className="h-full rounded-full bg-forest transition-[width] duration-700"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
