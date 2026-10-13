import { redirect } from "next/navigation";

export default function EditShopPage({ params }: { params: Promise<{ id: string }> }) {
  void params;
  redirect("/admin/products");
}
