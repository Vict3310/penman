import { updateEnquiry } from "@/app/actions/admin";
import { EmptyState, StatusBadge } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/utils";

export interface EnquiryRow {
  id: string;
  title: string;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  status: string;
  internal_notes: string | null;
  created_at: string;
  /** Extra labelled facts specific to the module. */
  meta: { label: string; value: string }[];
}

/**
 * Server component. The status form posts straight to the authorized
 * `updateEnquiry` action — no client JavaScript required.
 */
export function EnquiryTable({
  rows,
  table,
  statusOptions,
  emptyTitle,
  emptyDescription,
}: {
  rows: EnquiryRow[];
  table: "rental_enquiries" | "property_enquiries" | "shop_enquiries" | "contact_messages";
  statusOptions: { value: string; label: string }[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <article key={row.id} className="card-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-lg font-light tracking-tight">{row.title}</h2>
                <StatusBadge status={row.status} />
              </div>
              <p className="mt-2 text-sm text-black/60">
                <span className="font-medium text-ink">{row.name}</span>
                {" · "}
                <a href={`tel:${row.phone}`} className="hover:text-forest">
                  {row.phone}
                </a>
                {row.email ? (
                  <>
                    {" · "}
                    <a href={`mailto:${row.email}`} className="hover:text-forest">
                      {row.email}
                    </a>
                  </>
                ) : null}
              </p>
            </div>
            <p className="text-xs text-black/40">{formatDateTime(row.created_at)}</p>
          </div>

          {row.meta.length > 0 && (
            <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t border-black/5 pt-4 text-sm">
              {row.meta.map((item) => (
                <div key={item.label}>
                  <dt className="text-xs uppercase tracking-widest text-black/40">{item.label}</dt>
                  <dd className="mt-1">{item.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {row.message && (
            <div className="mt-4 rounded-xl bg-sage/50 p-4">
              <p className="text-xs uppercase tracking-widest text-black/40">Message</p>
              <p className="mt-2 whitespace-pre-line text-sm text-black/70">{row.message}</p>
            </div>
          )}

          <form action={updateEnquiry} className="mt-5 border-t border-black/5 pt-5">
            <input type="hidden" name="table" value={table} />
            <input type="hidden" name="id" value={row.id} />

            <div className="grid gap-4 sm:grid-cols-[200px_1fr_auto] sm:items-end">
              <div>
                <label htmlFor={`status-${row.id}`} className="field-label">
                  Status
                </label>
                <select
                  id={`status-${row.id}`}
                  name="status"
                  defaultValue={row.status}
                  className="field appearance-none py-2.5 text-sm"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={`notes-${row.id}`} className="field-label">
                  Internal notes
                </label>
                <textarea
                  id={`notes-${row.id}`}
                  name="internal_notes"
                  rows={2}
                  defaultValue={row.internal_notes ?? ""}
                  placeholder="Notes visible only to your team"
                  className="field resize-y py-2.5 text-sm"
                />
              </div>

              <button type="submit" className="btn-primary py-2.5 text-sm">
                Save
              </button>
            </div>
          </form>
        </article>
      ))}
    </div>
  );
}
