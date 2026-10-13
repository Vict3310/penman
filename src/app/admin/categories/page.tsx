import Link from "next/link";
import { Pencil } from "lucide-react";
import { AdminPageHeader, ConfirmForm } from "@/components/admin/ui";
import { EmptyState } from "@/components/ui/misc";
import { adminListCategories } from "@/lib/queries";
import { deleteCategory } from "@/app/actions/admin";
import { ProductCategoryForm } from "./category-form";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await adminListCategories();

  return (
    <>
      <AdminPageHeader
        title="Vehicle categories"
        description="Group inventory into categories so customers can filter the vehicle marketplace more easily."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          {categories.length > 0 ? (
            <div className="card-surface divide-y divide-black/5">
              {categories.map((category) => (
                <div key={category.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium">{category.name}</p>
                    <p className="mt-0.5 text-xs text-black/40">
                      /{category.slug} · position {category.position}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/categories/${category.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs transition-colors hover:bg-black/5"
                    >
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Edit
                    </Link>
                    <ConfirmForm
                      action={deleteCategory}
                      hidden={{ id: category.id }}
                      confirmMessage={`Delete "${category.name}"? Listings in it will keep their record but lose the category.`}
                    >
                      Delete
                    </ConfirmForm>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No categories yet"
              description="Create a category to help customers filter the vehicle marketplace."
            />
          )}
        </div>

        <aside>
          <div className="card-surface p-6">
            <h2 className="font-display text-lg font-light tracking-tight">Add a category</h2>
            <div className="mt-5">
              <ProductCategoryForm />
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
