import Link from "next/link";
import { Pencil } from "lucide-react";
import { AdminFilterBar, AdminPageHeader, ConfirmForm } from "@/components/admin/ui";
import { EmptyState, StatusBadge } from "@/components/ui/misc";
import { adminListVehicles } from "@/lib/queries";
import { deleteVehicle, setVehicleStatus } from "@/app/actions/admin";
import { formatCurrency } from "@/lib/utils";
import { readPage, readString, type RawSearchParams } from "@/lib/search-params";

export const dynamic = "force-dynamic";

export default async function AdminVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const result = await adminListVehicles({
    q: readString(params, "q"),
    status: readString(params, "status"),
    page: readPage(params),
  });

  return (
    <>
      <AdminPageHeader
        title="Vehicles"
        description="Create, edit and publish the vehicles shown on the rental page."
        action={{ href: "/admin/vehicles/new", label: "New vehicle" }}
      />

      <AdminFilterBar
        action="/admin/vehicles"
        query={readString(params, "q")}
        status={readString(params, "status")}
        placeholder="Search by name or category…"
        statusOptions={[
          { value: "draft", label: "Draft" },
          { value: "published", label: "Published" },
          { value: "archived", label: "Archived" },
        ]}
      />

      {result.items.length > 0 ? (
        <div className="card-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase tracking-widest text-black/40">
                  <th className="px-5 py-3 font-medium">Vehicle</th>
                  <th className="px-5 py-3 font-medium">Rate</th>
                  <th className="px-5 py-3 font-medium">Availability</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {result.items.map((vehicle) => (
                  <tr key={vehicle.id} className="align-middle">
                    <td className="px-5 py-4">
                      <p className="font-medium">{vehicle.name}</p>
                      <p className="mt-0.5 text-xs text-black/40">
                        {vehicle.category}
                        {vehicle.is_featured ? " · Featured" : ""}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-black/60">
                      {vehicle.rate
                        ? `${formatCurrency(vehicle.rate, vehicle.currency)} / ${vehicle.rate_period}`
                        : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={vehicle.availability} />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={vehicle.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Link
                          href={`/admin/vehicles/${vehicle.id}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs transition-colors hover:bg-black/5"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                          Edit
                        </Link>

                        {vehicle.status !== "published" ? (
                          <ConfirmForm
                            action={setVehicleStatus}
                            hidden={{ id: vehicle.id, status: "published" }}
                            confirmMessage={`Publish "${vehicle.name}" to the public website?`}
                          >
                            Publish
                          </ConfirmForm>
                        ) : (
                          <ConfirmForm
                            action={setVehicleStatus}
                            hidden={{ id: vehicle.id, status: "draft" }}
                            confirmMessage={`Unpublish "${vehicle.name}"? It will be hidden from the public site.`}
                          >
                            Unpublish
                          </ConfirmForm>
                        )}

                        {vehicle.status !== "archived" && (
                          <ConfirmForm
                            action={setVehicleStatus}
                            hidden={{ id: vehicle.id, status: "archived" }}
                            confirmMessage={`Archive "${vehicle.name}"? It will stay in your records but leave the site.`}
                          >
                            Archive
                          </ConfirmForm>
                        )}

                        <ConfirmForm
                          action={deleteVehicle}
                          hidden={{ id: vehicle.id }}
                          confirmMessage={`Permanently delete "${vehicle.name}"? This cannot be undone.`}
                        >
                          Delete
                        </ConfirmForm>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.pageCount > 1 && (
            <p className="border-t border-black/10 px-5 py-3 text-xs text-black/40">
              Page {result.page} of {result.pageCount} · {result.total} vehicles
            </p>
          )}
        </div>
      ) : (
        <EmptyState
          title="No vehicles yet"
          description="Add your first vehicle and it will appear on the rental page once published."
          action={{ href: "/admin/vehicles/new", label: "Add a vehicle" }}
        />
      )}
    </>
  );
}
