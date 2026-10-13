"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Page header ─────────────────────────────────────────────────────── */

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-light tracking-tight">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-black/50">{description}</p>}
      </div>
      {action && (
        <Link href={action.href} className="btn-primary shrink-0 py-2.5 text-sm">
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          {action.label}
        </Link>
      )}
    </div>
  );
}

/* ── Stat card ───────────────────────────────────────────────────────── */

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "accent";
}) {
  return (
    <div
      className={cn(
        "card-surface p-5",
        tone === "accent" && "border-forest/20 bg-forest text-white",
      )}
    >
      <p className={cn("text-xs uppercase tracking-widest", tone === "accent" ? "text-white/60" : "text-black/40")}>
        {label}
      </p>
      <p className="mt-3 font-display text-3xl font-light tracking-tight">{value}</p>
      {hint && <p className={cn("mt-2 text-xs", tone === "accent" ? "text-white/60" : "text-black/40")}>{hint}</p>}
    </div>
  );
}

/* ── Search + status filter (plain GET form, no client JS needed) ────── */

export function AdminFilterBar({
  action,
  query,
  status,
  placeholder = "Search…",
  statusOptions,
}: {
  action: string;
  query?: string;
  status?: string;
  placeholder?: string;
  statusOptions?: { value: string; label: string }[];
}) {
  return (
    <form action={action} method="get" className="mb-6 flex flex-wrap items-center gap-3" role="search">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" strokeWidth={1.5} />
        <input
          name="q"
          type="search"
          defaultValue={query ?? ""}
          placeholder={placeholder}
          className="field py-2.5 pl-10 text-sm"
          aria-label="Search"
        />
      </div>
      {statusOptions && (
        <select name="status" defaultValue={status ?? ""} className="field w-auto appearance-none py-2.5 pr-8 text-sm" aria-label="Status">
          <option value="">All statuses</option>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
      <button type="submit" className="btn-ghost py-2.5">
        Filter
      </button>
    </form>
  );
}

/* ── Destructive action with confirmation ────────────────────────────── */

function PendingButton({
  children,
  className,
  confirmMessage,
}: {
  children: React.ReactNode;
  className?: string;
  confirmMessage: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
      className={className}
    >
      {pending ? "Working…" : children}
    </button>
  );
}

/**
 * A form that performs a destructive or state-changing action. Always asks
 * for confirmation first — soft actions (publish/unpublish) can opt out.
 */
export function ConfirmForm({
  action,
  hidden,
  children,
  className,
  confirmMessage = "Are you sure? This cannot be undone.",
}: {
  action: (formData: FormData) => void | Promise<void>;
  hidden: Record<string, string | undefined>;
  children: React.ReactNode;
  className?: string;
  confirmMessage?: string;
}) {
  return (
    <form action={action} className={className}>
      {Object.entries(hidden).map(([key, value]) =>
        value === undefined ? null : <input key={key} type="hidden" name={key} value={value} />,
      )}
      <PendingButton
        className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-black/60 transition-colors hover:bg-black/5 disabled:opacity-50"
        confirmMessage={confirmMessage}
      >
        {children}
      </PendingButton>
    </form>
  );
}
