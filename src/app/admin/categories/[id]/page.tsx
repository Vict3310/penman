import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/ui";
import { adminListCategories } from "@/lib/queries";
import { ProductCategoryForm } from "../category-form";

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const categories = await adminListCategories();
  const category = categories.find((c) => c.id === id);
  if (!category) notFound();

  return (
    <>
      <AdminPageHeader title={`Edit ${category.name}`} />
      <div className="card-surface max-w-md p-6">
        <ProductCategoryForm category={category} />
        <Link href="/admin/categories" className="mt-4 inline-block text-sm text-black/50 hover:text-ink">
          ← Back to categories
        </Link>
      </div>
    </>
  );
}
