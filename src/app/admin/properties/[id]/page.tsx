import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";
import { ResourceForm } from "@/components/admin/resource-form";
import { propertySections, propertyValues } from "@/components/admin/forms";
import { saveProperty } from "@/app/actions/admin";
import { adminGetProperty } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await adminGetProperty(id);
  if (!property) notFound();

  return (
    <>
      <AdminPageHeader title={property.title} description="Update this listing's details, images and publishing state." />
      {property.status === "published" && (
        <Link
          href={`/real-estate/${property.slug}`}
          target="_blank"
          className="mb-6 inline-flex items-center gap-2 text-sm text-forest hover:underline"
        >
          <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
          View on the public site
        </Link>
      )}
      <ResourceForm
        action={saveProperty}
        id={property.id}
        sections={propertySections()}
        initialValues={propertyValues(property)}
        submitLabel="Save changes"
        cancelHref="/admin/properties"
      />
    </>
  );
}
