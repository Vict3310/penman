import Link from "next/link";
import { ArrowRight, PackageCheck } from "lucide-react";
import { AdminPageHeader, StatCard } from "@/components/admin/ui";
import { adminDashboardCounts, adminRecentActivity } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const [counts, activity] = await Promise.all([adminDashboardCounts(), adminRecentActivity(4)]);

  return (
    <>
      <AdminPageHeader
        title="Vehicle sales"
        description="Summary of the car-buying and customer enquiry workflow."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="New sales enquiries" value={counts.newShopEnquiries} hint="Awaiting buyer follow-up" tone="accent" />
        <StatCard label="Open contact messages" value={counts.newContactMessages} hint="Potential leads and requests" />
        <StatCard label="Recent updates" value={activity.length} hint="Latest customer activity" />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="card-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-black/40">Sales flow</p>
              <h2 className="mt-2 font-display text-xl tracking-tight">Vehicle sales queue</h2>
            </div>
            <PackageCheck className="h-5 w-5 text-slate-700" strokeWidth={1.5} />
          </div>
          <p className="mt-3 text-sm text-black/55">
            Active buyer enquiries are reviewed in the unified enquiries inbox and can be routed to follow-up or confirmation.
          </p>
          <Link href="/admin/enquiries/shop" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            View sales enquiries
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </div>

        <div className="card-surface p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-black/40">Latest updates</p>
          <div className="mt-4 space-y-3">
            {activity.slice(0, 3).map((item) => (
              <div key={`${item.kind}-${item.id}`} className="rounded-xl border border-black/5 bg-[#faf9f7] p-3">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-black/45">{item.kind} · {item.subtitle ?? "Customer"}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
