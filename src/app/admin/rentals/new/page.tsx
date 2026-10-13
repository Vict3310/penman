import { redirect } from "next/navigation";

export default function NewRentalPage() {
  redirect("/admin/vehicles/new");
}
