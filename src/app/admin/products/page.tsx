import Link from "next/link";
import { Pencil } from "lucide-react";
import { AdminFilterBar, AdminPageHeader, ConfirmForm } from "@/components/admin/ui";
import { EmptyState, StatusBadge } from "@/components/ui/misc";
import { adminListProducts } from "@/lib/queries";
import { deleteProduct, setProductStatus } from "@/app/actions/admin";
import { formatCurrency } from "@/lib/utils";
import { readPage, readString, type RawSearchParams } from "@/lib/search-params";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const result = await adminListProducts({
    q: readString(params, "q"),
    status: readString(params, "status"),
    page: readPage(params),
  });

  return (
    <>
      <AdminPageHeader
        title="Cars for sale"
        description="Manage the vehicle marketplace, pricing, stock levels and which listings are featured."
        action={{ href: "/admin/products/new", label: "New listing" }}
      />

      <AdminFilterBar
        action="/admin/products"
        query={readString(params, "q")}
        status={readString(params, "status")}
        placeholder="Search by name or SKU…"
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
                  <th className="px-5 py-3 font-medium">Vehicle</th>
                  <th className="px-5 py-3 font-medium">Price</th>
                  <th className="px-5 py-3 font-medium">Stock</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {result.items.map((product) => (
                  <tr key={product.id}>
                    <td className="px-5 py-4">
                      <p className="font-medium">{product.name}</p>
                      <p className="mt-0.5 text-xs text-black/40">
                        {product.sku ? `SKU ${product.sku}` : "No SKU"}
                        {product.is_featured ? " · Featured" : ""}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-black/60">{formatCurrency(product.price, product.currency)}</td>
                    <td className="px-5 py-4 text-black/60">
                      {product.track_stock ? `${product.stock_quantity} tracked` : "Not tracked"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={product.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs transition-colors hover:bg-black/5"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                          Edit
                        </Link>
                        {product.status !== "published" ? (
                          <ConfirmForm
                            action={setProductStatus}
                            hidden={{ id: product.id, status: "published" }}
                            confirmMessage={`Publish "${product.name}" to the vehicle marketplace?`}
                          >
                            Publish
                          </ConfirmForm>
                        ) : (
                          <ConfirmForm
                            action={setProductStatus}
                            hidden={{ id: product.id, status: "draft" }}
                            confirmMessage={`Unpublish "${product.name}"?`}
                          >
                            Unpublish
                          </ConfirmForm>
                        )}
                        {product.status !== "archived" && (
                          <ConfirmForm
                            action={setProductStatus}
                            hidden={{ id: product.id, status: "archived" }}
                            confirmMessage={`Archive "${product.name}"?`}
                          >
                            Archive
                          </ConfirmForm>
                        )}
                        <ConfirmForm
                          action={deleteProduct}
                          hidden={{ id: product.id }}
                          confirmMessage={`Permanently delete "${product.name}"? This cannot be undone.`}
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
          title="No listings yet"
          description="Add your first car and it will appear in the marketplace once published."
          action={{ href: "/admin/products/new", label: "Add a listing" }}
        />
      )}
    </>
  );
}
