import { redirect } from "next/navigation";

export default function EditRealEstatePage({ params }: { params: Promise<{ id: string }> }) {
  void params;
  redirect("/admin/properties");
}
