import { AdminPageHeader } from "@/components/admin/ui";
import { ResourceForm } from "@/components/admin/resource-form";
import { propertySections, propertyValues } from "@/components/admin/forms";
import { saveProperty } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

export default function NewPropertyPage() {
  return (
    <>
      <AdminPageHeader
        title="New property"
        description="Add a listing, upload its photographs and publish it to the real estate page."
      />
      <ResourceForm
        action={saveProperty}
        sections={propertySections()}
        initialValues={propertyValues(null)}
        submitLabel="Create property"
        cancelHref="/admin/properties"
      />
    </>
  );
}
