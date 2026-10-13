import { AdminPageHeader } from "@/components/admin/ui";
import { ResourceForm } from "@/components/admin/resource-form";
import { productSections, productValues } from "@/components/admin/forms";
import { saveProduct } from "@/app/actions/admin";
import { adminListCategories } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await adminListCategories();

  return (
    <>
      <AdminPageHeader
        title="New vehicle listing"
        description="Add a car to the marketplace, set the selling price and upload photographs."
      />
      <ResourceForm
        action={saveProduct}
        sections={productSections(categories)}
        initialValues={productValues(null)}
        submitLabel="Create listing"
        cancelHref="/admin/products"
      />
    </>
  );
}
