"use server";

import { revalidatePath } from "next/cache";

import { requireAdminForAction } from "@/lib/auth/admin";
import { getAdminClient } from "@/lib/supabase/admin";

/**
 * Publication control for imported inventory.
 *
 * The importer writes listings as drafts precisely so that nothing reaches the
 * catalogue unseen (see scripts/import-cars.mjs). This is the decision that
 * releases one of them, and it is deliberately the only thing an administrator
 * can do to imported inventory from the admin panel: no editing, no deleting,
 * no bulk publish.
 *
 * Two guards, both server-side:
 *
 *   1. `requireAdminForAction()` reads the caller's session and their
 *      `profiles` row. An unauthorised call aborts before touching anything.
 *   2. The UPDATE is scoped with `inventory_source is not null`. A form that
 *      submitted a hand-curated product's id therefore matches no row: this
 *      action is structurally incapable of changing genuine inventory, even if
 *      the form is tampered with.
 *
 * Imported listings are published as-is. Nothing here can claim availability,
 * which is why the status flip is the whole operation.
 */
export async function setImportedListingStatus(formData: FormData): Promise<void> {
  const admin = await requireAdminForAction();
  if (!admin) throw new Error("You do not have permission to perform that action.");

  const id = String(formData.get("id") ?? "");
  const publish = String(formData.get("publish") ?? "") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("That listing could not be identified.");

  const supabase = getAdminClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("products")
    .update({
      status: publish ? "published" : "draft",
      published_at: publish ? now : null,
      updated_at: now,
    })
    .eq("id", id)
    .not("inventory_source", "is", null);

  if (error) throw new Error(`Could not update that listing: ${error.message}`);

  // The catalogue pages and the detail template are cached for a minute; make
  // the change visible now rather than after the next revalidation.
  revalidatePath("/admin/import");
  revalidatePath("/shop/cars");
  revalidatePath("/autos/cars");
  revalidatePath("/shop/[slug]", "page");
}
