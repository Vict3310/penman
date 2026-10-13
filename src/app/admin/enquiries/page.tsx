import Link from "next/link";
import { ArrowRight, Building2, CarFront, ShoppingBag } from "lucide-react";
import { AdminPageHeader, StatCard } from "@/components/admin/ui";
import { adminDashboardCounts, adminRecentActivity } from "@/lib/queries";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EnquiriesPage() {
  const [counts, activity] = await Promise.all([adminDashboardCounts(), adminRecentActivity(6)]);

  return (
    <>
      <AdminPageHeader
        title="Enquiries inbox"
        description="A single operating view across rentals, vehicle sales and property enquiries."
        action={{ href: "/admin/enquiries/rental", label: "Open inbox" }}
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Rental" value={counts.newRentalEnquiries} hint="Awaiting response" tone="accent" />
        <StatCard label="Property" value={counts.newPropertyEnquiries} hint="Waiting for follow-up" />
        <StatCard label="Vehicle sales" value={counts.newShopEnquiries} hint="New buyer enquiries" />
        <StatCard label="Messages" value={counts.newContactMessages} hint="Contact form leads" />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        {[
          {
            href: "/admin/enquiries/rental",
            title: "Rental enquiries",
            icon: CarFront,
            count: counts.newRentalEnquiries,
            label: "View rental leads",
          },
          {
            href: "/admin/enquiries/property",
            title: "Property enquiries",
            icon: Building2,
            count: counts.newPropertyEnquiries,
            label: "Review property requests",
          },
          {
            href: "/admin/enquiries/shop",
            title: "Vehicle sales enquiries",
            icon: ShoppingBag,
            count: counts.newShopEnquiries,
            label: "Manage buyer requests",
          },
        ].map(({ href, title, icon: Icon, count, label }) => (
          <Link key={href} href={href} className="card-surface block p-5 transition-shadow hover:shadow-lg hover:shadow-black/5">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">
                <Icon className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{count} new</span>
            </div>
            <h2 className="mt-4 font-display text-xl tracking-tight">{title}</h2>
            <p className="mt-2 text-sm text-black/50">{label}</p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              Open inbox
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </div>
          </Link>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-black/40">Recent activity</h2>
        <div className="card-surface divide-y divide-black/5">
          {activity.map((item) => (
            <div key={`${item.kind}-${item.id}`} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">{item.title}</p>
                <p className="mt-0.5 text-xs text-black/40">
                  {item.kind} · {item.subtitle ?? "Customer"} · {formatDateTime(item.createdAt)}
                </p>
              </div>
              <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-700">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
