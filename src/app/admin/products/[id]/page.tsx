import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";
import { ResourceForm } from "@/components/admin/resource-form";
import { productSections, productValues } from "@/components/admin/forms";
import { saveProduct } from "@/app/actions/admin";
import { adminGetProduct, adminListCategories } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([adminGetProduct(id), adminListCategories()]);
  if (!product) notFound();

  return (
    <>
      <AdminPageHeader title={product.name} description="Update this vehicle listing, pricing and publishing state." />
      {product.status === "published" && (
        <Link
          href={`/shop/${product.slug}`}
          target="_blank"
          className="mb-6 inline-flex items-center gap-2 text-sm text-forest hover:underline"
        >
          <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
          View on the public marketplace
        </Link>
      )}
      <ResourceForm
        action={saveProduct}
        id={product.id}
        sections={productSections(categories)}
        initialValues={productValues(product)}
        submitLabel="Save changes"
        cancelHref="/admin/products"
      />
    </>
  );
}
