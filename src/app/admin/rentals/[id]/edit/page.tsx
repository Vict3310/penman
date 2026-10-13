import { redirect } from "next/navigation";

export default function EditRentalPage({ params }: { params: Promise<{ id: string }> }) {
  void params;
  redirect("/admin/vehicles");
}
