import { redirect } from "next/navigation";

export default function NewShopPage() {
  redirect("/admin/products/new");
}
