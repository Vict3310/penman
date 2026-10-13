/**
 * Suspense fallback for catalogue result grids. Scoped inside each catalogue
 * page rather than via a segment-level loading.tsx, so detail routes still
 * return a true 404 status for missing listings.
 */
export function ResultsSkeleton({ columns = 3 }: { columns?: 3 | 4 }) {
  return (
    <div role="status" aria-live="polite" className="mt-2">
      <span className="sr-only">Loading listings…</span>
      <div className="mb-6 h-4 w-40 animate-pulse rounded-full bg-black/5" />
      <div
        className={
          columns === 4
            ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
            : "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        }
      >
        {Array.from({ length: columns === 4 ? 8 : 6 }, (_, i) => (
          <div key={i} className="card-surface animate-pulse overflow-hidden">
            <div className="aspect-[4/3] bg-black/5" />
            <div className="space-y-3 p-5">
              <div className="h-4 w-2/3 rounded-full bg-black/10" />
              <div className="h-3 w-1/3 rounded-full bg-black/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
