import { AdminPageHeader } from "@/components/admin/ui";
import { ResourceForm } from "@/components/admin/resource-form";
import { vehicleSections, vehicleValues } from "@/components/admin/forms";
import { saveVehicle } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

export default function NewVehiclePage() {
  return (
    <>
      <AdminPageHeader
        title="New vehicle"
        description="Create a vehicle, upload its photographs and publish it to the rental page."
      />
      <ResourceForm
        action={saveVehicle}
        sections={vehicleSections()}
        initialValues={vehicleValues(null)}
        submitLabel="Create vehicle"
        cancelHref="/admin/vehicles"
      />
    </>
  );
}
