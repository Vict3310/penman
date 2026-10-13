import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AdminPageHeader, StatCard } from "@/components/admin/ui";
import { EmptyState, StatusBadge } from "@/components/ui/misc";
import { adminDashboardCounts, adminRecentActivity } from "@/lib/queries";
import { hasServiceRole } from "@/lib/env";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [counts, activity] = await Promise.all([adminDashboardCounts(), adminRecentActivity(8)]);
  const configured = hasServiceRole();
  const demoMode = !configured;

  return (
    <>
      <AdminPageHeader
        title="Overview"
        description="A live view of your listings and incoming enquiries across all three businesses."
      />

      {demoMode && (
        <div className="mb-8 rounded-2xl border border-forest/25 bg-sage p-5 text-sm text-forest">
          <p className="font-medium">Demo mode preview</p>
          <p className="mt-1.5">
            The admin dashboard is showing mock business data so you can review the workflow before the real Supabase
            connection is added.
          </p>
        </div>
      )}

      {!configured && !demoMode && (
        <div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-medium">Server credentials missing</p>
          <p className="mt-1.5">
            <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> is not set, so enquiry data cannot be read or
            written. Add it in your environment settings and redeploy. See{" "}
            <code className="text-xs">docs/DEPLOYMENT.md</code>.
          </p>
        </div>
      )}

      <section aria-labelledby="listings-heading">
        <h2 id="listings-heading" className="mb-4 text-sm font-medium uppercase tracking-widest text-black/40">
          Published listings
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Vehicles" value={counts.vehicles} hint="Published for rental" />
          <StatCard label="Properties" value={counts.properties} hint="Published and visible on the site" />
          <StatCard label="Cars for sale" value={counts.products} hint="Published in the vehicle marketplace" />
        </div>
      </section>

      <section aria-labelledby="enquiries-heading" className="mt-10">
        <h2 id="enquiries-heading" className="mb-4 text-sm font-medium uppercase tracking-widest text-black/40">
          New enquiries
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/admin/enquiries/rental" className="transition-transform hover:-translate-y-0.5">
            <StatCard label="Rental" value={counts.newRentalEnquiries} hint="Awaiting a response" tone="accent" />
          </Link>
          <Link href="/admin/enquiries/property" className="transition-transform hover:-translate-y-0.5">
            <StatCard label="Property" value={counts.newPropertyEnquiries} hint="Awaiting a response" />
          </Link>
          <Link href="/admin/enquiries/shop" className="transition-transform hover:-translate-y-0.5">
            <StatCard label="Vehicle sales" value={counts.newShopEnquiries} hint="Awaiting a response" />
          </Link>
          <Link href="/admin/messages" className="transition-transform hover:-translate-y-0.5">
            <StatCard label="Messages" value={counts.newContactMessages} hint="From the contact page" />
          </Link>
        </div>
      </section>

      <section aria-labelledby="activity-heading" className="mt-12">
        <h2 id="activity-heading" className="mb-4 text-sm font-medium uppercase tracking-widest text-black/40">
          Recent activity
        </h2>

        {activity.length > 0 ? (
          <div className="card-surface divide-y divide-black/5">
            {activity.map((item) => (
              <div key={`${item.kind}-${item.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="mt-0.5 truncate text-xs text-black/40">
                    {item.kind}
                    {item.subtitle ? ` · ${item.subtitle}` : ""} · {formatDateTime(item.createdAt)}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No enquiries yet"
            description="When a visitor submits a form on the public site, it will appear here straight away."
          />
        )}
      </section>

      <section className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { href: "/admin/vehicles/new", label: "Add a vehicle" },
          { href: "/admin/properties/new", label: "Add a property" },
          { href: "/admin/products/new", label: "Add a car for sale" },
        ].map((quick) => (
          <Link
            key={quick.href}
            href={quick.href}
            className="card-surface flex items-center justify-between p-5 text-sm transition-shadow hover:shadow-lg hover:shadow-black/5"
          >
            {quick.label}
            <ArrowUpRight className="h-4 w-4 text-forest" strokeWidth={1.5} />
          </Link>
        ))}
      </section>
    </>
  );
}
