/**
 * Loading skeleton for every account route.
 *
 * Placed at the account root so all five pages share it: a route-specific
 * skeleton per page would be five near-identical files, and the shape here —
 * a header, a row of cards, a panel — matches what each of them renders.
 *
 * `aria-busy` and the visually hidden "Loading your account" give assistive
 * technology something to announce, since a screen full of grey rectangles
 * says nothing on its own.
 */
export default function AccountLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your account…</span>

      <div className="mb-8 animate-pulse">
        <div className="h-3 w-28 rounded-full bg-black/10" />
        <div className="mt-4 h-9 w-64 max-w-full rounded-full bg-black/10" />
        <div className="mt-4 h-4 w-full max-w-xl rounded-full bg-black/[0.07]" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="card-surface animate-pulse p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="h-3 w-24 rounded-full bg-black/10" />
              <div className="h-9 w-9 rounded-full bg-black/10" />
            </div>
            <div className="mt-5 h-8 w-20 rounded-full bg-black/10" />
            <div className="mt-3 h-3 w-full rounded-full bg-black/[0.07]" />
          </div>
        ))}
      </div>

      <div className="card-surface mt-6 animate-pulse p-6">
        <div className="h-5 w-40 rounded-full bg-black/10" />
        <div className="mt-5 space-y-4">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-4 w-full rounded-full bg-black/[0.07]" />
          ))}
        </div>
      </div>
    </div>
  );
}
