import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";
import { ResourceForm } from "@/components/admin/resource-form";
import { vehicleSections, vehicleValues } from "@/components/admin/forms";
import { saveVehicle } from "@/app/actions/admin";
import { adminGetVehicle } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vehicle = await adminGetVehicle(id);
  if (!vehicle) notFound();

  return (
    <>
      <AdminPageHeader title={vehicle.name} description="Update this vehicle's details, images and publishing state." />
      {vehicle.status === "published" && (
        <Link
          href={`/rental/${vehicle.slug}`}
          target="_blank"
          className="mb-6 inline-flex items-center gap-2 text-sm text-forest hover:underline"
        >
          <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
          View on the public site
        </Link>
      )}
      <ResourceForm
        action={saveVehicle}
        id={vehicle.id}
        sections={vehicleSections()}
        initialValues={vehicleValues(vehicle)}
        submitLabel="Save changes"
        cancelHref="/admin/vehicles"
      />
    </>
  );
}
