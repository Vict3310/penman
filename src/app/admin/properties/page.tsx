import Link from "next/link";
import { Pencil } from "lucide-react";
import { AdminFilterBar, AdminPageHeader, ConfirmForm } from "@/components/admin/ui";
import { EmptyState, StatusBadge } from "@/components/ui/misc";
import { adminListProperties } from "@/lib/queries";
import { deleteProperty, setPropertyStatus } from "@/app/actions/admin";
import { formatCurrency } from "@/lib/utils";
import { readPage, readString, type RawSearchParams } from "@/lib/search-params";

export const dynamic = "force-dynamic";

export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const result = await adminListProperties({
    q: readString(params, "q"),
    status: readString(params, "status"),
    page: readPage(params),
  });

  return (
    <>
      <AdminPageHeader
        title="Properties"
        description="Manage the real estate listings shown on the public site."
        action={{ href: "/admin/properties/new", label: "New property" }}
      />

      <AdminFilterBar
        action="/admin/properties"
        query={readString(params, "q")}
        status={readString(params, "status")}
        placeholder="Search by title or location…"
        statusOptions={[
          { value: "draft", label: "Draft" },
          { value: "published", label: "Published" },
          { value: "archived", label: "Archived" },
        ]}
      />

      {result.items.length > 0 ? (
        <div className="card-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase tracking-widest text-black/40">
                  <th className="px-5 py-3 font-medium">Property</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Price</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {result.items.map((property) => (
                  <tr key={property.id}>
                    <td className="px-5 py-4">
                      <p className="font-medium">{property.title}</p>
                      <p className="mt-0.5 text-xs text-black/40">
                        {property.location}
                        {property.is_featured ? " · Featured" : ""}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-black/60">
                      {property.listing_type === "sale" ? "For sale" : "To let"} · {property.property_type}
                    </td>
                    <td className="px-5 py-4 text-black/60">
                      {property.price_type === "on_request" || property.price === null
                        ? "On request"
                        : formatCurrency(property.price, property.currency)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1.5">
                        <StatusBadge status={property.status} />
                        <StatusBadge status={property.availability} />
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Link
                          href={`/admin/properties/${property.id}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs transition-colors hover:bg-black/5"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                          Edit
                        </Link>
                        {property.status !== "published" ? (
                          <ConfirmForm
                            action={setPropertyStatus}
                            hidden={{ id: property.id, status: "published" }}
                            confirmMessage={`Publish "${property.title}"?`}
                          >
                            Publish
                          </ConfirmForm>
                        ) : (
                          <ConfirmForm
                            action={setPropertyStatus}
                            hidden={{ id: property.id, status: "draft" }}
                            confirmMessage={`Unpublish "${property.title}"?`}
                          >
                            Unpublish
                          </ConfirmForm>
                        )}
                        {property.status !== "archived" && (
                          <ConfirmForm
                            action={setPropertyStatus}
                            hidden={{ id: property.id, status: "archived" }}
                            confirmMessage={`Archive "${property.title}"?`}
                          >
                            Archive
                          </ConfirmForm>
                        )}
                        <ConfirmForm
                          action={deleteProperty}
                          hidden={{ id: property.id }}
                          confirmMessage={`Permanently delete "${property.title}"? This cannot be undone.`}
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
              Page {result.page} of {result.pageCount} · {result.total} listings
            </p>
          )}
        </div>
      ) : (
        <EmptyState
          title="No properties yet"
          description="Add your first listing and it will appear on the real estate page once published."
          action={{ href: "/admin/properties/new", label: "Add a property" }}
        />
      )}
    </>
  );
}
