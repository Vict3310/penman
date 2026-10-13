"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { fail, succeed, type ActionResult } from "@/lib/action-result";
import {
  categorySchema,
  productSchema,
  propertySchema,
  vehicleSchema,
  settingsSectionSchema,
  zodFieldErrors,
} from "@/lib/validation";

/**
 * Every action below begins with `requireAdmin()`, which redirects unless the
 * caller is a verified administrator. Authorization is therefore enforced on
 * the server for every mutation, independent of what the UI shows.
 */

function parsePayload(formData: FormData): unknown {
  const raw = formData.get("payload");
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
}

function failWith(error: { message: string } | null): ActionResult {
  return fail(
    error?.message?.includes("duplicate key")
      ? "That slug is already in use. Choose a different one."
      : "The record could not be saved. Please check the fields and try again.",
  );
}

function revalidatePublic(section: "rental" | "real-estate" | "shop") {
  revalidatePath("/");
  revalidatePath(`/${section}`);
  revalidatePath("/admin", "layout");
}

/* ══════════════════════════════════════════════════════════════════════
   VEHICLES
   ══════════════════════════════════════════════════════════════════════ */

export async function saveVehicle(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const parsed = vehicleSchema.safeParse(parsePayload(formData));
  if (!parsed.success) {
    return fail("Please correct the highlighted fields.", zodFieldErrors(parsed.error));
  }

  const id = formData.get("id");
  const values = {
    ...parsed.data,
    published_at: parsed.data.status === "published" ? new Date().toISOString() : null,
  };

  try {
    const supabase = getAdminClient();
    if (isUuid(id)) {
      const { error } = await supabase.from("vehicles").update(values).eq("id", id);
      if (error) return failWith(error);
    } else {
      const { error } = await supabase.from("vehicles").insert(values);
      if (error) return failWith(error);
    }
    revalidatePublic("rental");
    revalidatePath(`/rental/${parsed.data.slug}`);
    return succeed(isUuid(id) ? "Vehicle updated." : "Vehicle created.");
  } catch {
    return fail("The vehicle could not be saved.");
  }
}

export async function setVehicleStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id");
  const status = formData.get("status");
  if (!isUuid(id) || typeof status !== "string") return;

  await getAdminClient()
    .from("vehicles")
    .update({ status, published_at: status === "published" ? new Date().toISOString() : null })
    .eq("id", id);

  revalidatePath("/admin/vehicles");
  revalidatePublic("rental");
}

export async function deleteVehicle(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id");
  if (!isUuid(id)) return;

  // Enquiries reference the vehicle with ON DELETE SET NULL and keep their
  // own name snapshot, so records are never lost by removing a vehicle.
  await getAdminClient().from("vehicles").delete().eq("id", id);

  revalidatePath("/admin/vehicles");
  revalidatePublic("rental");
}

/* ══════════════════════════════════════════════════════════════════════
   PROPERTIES
   ══════════════════════════════════════════════════════════════════════ */

export async function saveProperty(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const parsed = propertySchema.safeParse(parsePayload(formData));
  if (!parsed.success) {
    return fail("Please correct the highlighted fields.", zodFieldErrors(parsed.error));
  }

  const id = formData.get("id");
  const values = {
    ...parsed.data,
    published_at: parsed.data.status === "published" ? new Date().toISOString() : null,
  };

  try {
    const supabase = getAdminClient();
    if (isUuid(id)) {
      const { error } = await supabase.from("properties").update(values).eq("id", id);
      if (error) return failWith(error);
    } else {
      const { error } = await supabase.from("properties").insert(values);
      if (error) return failWith(error);
    }
    revalidatePublic("real-estate");
    revalidatePath(`/real-estate/${parsed.data.slug}`);
    return succeed(isUuid(id) ? "Property updated." : "Property created.");
  } catch {
    return fail("The property could not be saved.");
  }
}

export async function setPropertyStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id");
  const status = formData.get("status");
  if (!isUuid(id) || typeof status !== "string") return;

  await getAdminClient()
    .from("properties")
    .update({ status, published_at: status === "published" ? new Date().toISOString() : null })
    .eq("id", id);

  revalidatePath("/admin/properties");
  revalidatePublic("real-estate");
}

export async function deleteProperty(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id");
  if (!isUuid(id)) return;

  await getAdminClient().from("properties").delete().eq("id", id);

  revalidatePath("/admin/properties");
  revalidatePublic("real-estate");
}

/* ══════════════════════════════════════════════════════════════════════
   PRODUCTS
   ══════════════════════════════════════════════════════════════════════ */

export async function saveProduct(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const parsed = productSchema.safeParse(parsePayload(formData));
  if (!parsed.success) {
    return fail("Please correct the highlighted fields.", zodFieldErrors(parsed.error));
  }

  const id = formData.get("id");
  const values = {
    ...parsed.data,
    published_at: parsed.data.status === "published" ? new Date().toISOString() : null,
  };

  try {
    const supabase = getAdminClient();
    if (isUuid(id)) {
      const { error } = await supabase.from("products").update(values).eq("id", id);
      if (error) return failWith(error);
    } else {
      const { error } = await supabase.from("products").insert(values);
      if (error) return failWith(error);
    }
    revalidatePublic("shop");
    revalidatePath(`/shop/${parsed.data.slug}`);
    return succeed(isUuid(id) ? "Product updated." : "Product created.");
  } catch {
    return fail("The product could not be saved.");
  }
}

export async function setProductStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id");
  const status = formData.get("status");
  if (!isUuid(id) || typeof status !== "string") return;

  await getAdminClient()
    .from("products")
    .update({ status, published_at: status === "published" ? new Date().toISOString() : null })
    .eq("id", id);

  revalidatePath("/admin/products");
  revalidatePublic("shop");
}

export async function deleteProduct(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id");
  if (!isUuid(id)) return;

  await getAdminClient().from("products").delete().eq("id", id);

  revalidatePath("/admin/products");
  revalidatePublic("shop");
}

/* ══════════════════════════════════════════════════════════════════════
   CATEGORIES
   ══════════════════════════════════════════════════════════════════════ */

export async function saveCategory(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const parsed = categorySchema.safeParse(parsePayload(formData));
  if (!parsed.success) return fail("Please correct the highlighted fields.", zodFieldErrors(parsed.error));

  const id = formData.get("id");
  try {
    const supabase = getAdminClient();
    if (isUuid(id)) {
      const { error } = await supabase.from("product_categories").update(parsed.data).eq("id", id);
      if (error) return failWith(error);
    } else {
      const { error } = await supabase.from("product_categories").insert(parsed.data);
      if (error) return failWith(error);
    }
    revalidatePath("/admin/categories");
    revalidatePath("/shop");
    return succeed(isUuid(id) ? "Category updated." : "Category created.");
  } catch {
    return fail("The category could not be saved.");
  }
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id");
  if (!isUuid(id)) return;

  // Products keep their record; their category_id is set to null by the FK.
  await getAdminClient().from("product_categories").delete().eq("id", id);

  revalidatePath("/admin/categories");
  revalidatePath("/shop");
}

/* ══════════════════════════════════════════════════════════════════════
   ENQUIRIES  (status + internal notes)
   ══════════════════════════════════════════════════════════════════════ */

const ENQUIRY_TABLES = {
  rental: "rental_enquiries",
  property: "property_enquiries",
  shop: "shop_enquiries",
  contact: "contact_messages",
} as const;

const SHOP_STATUSES = ["new", "contacted", "fulfilled", "cancelled"];
const STATUSES = ["new", "contacted", "confirmed", "declined", "closed"];

export async function updateEnquiry(formData: FormData): Promise<void> {
  await requireAdmin();

  const table = formData.get("table");
  const id = formData.get("id");
  const status = formData.get("status");
  const notes = formData.get("internal_notes");

  if (typeof table !== "string" || !(table in ENQUIRY_TABLES)) return;
  if (!isUuid(id) || typeof status !== "string") return;

  const allowed = table === "shop_enquiries" ? SHOP_STATUSES : STATUSES;
  if (!allowed.includes(status)) return;

  const resolved = ENQUIRY_TABLES[table as keyof typeof ENQUIRY_TABLES];

  await getAdminClient()
    .from(resolved)
    .update({
      status,
      internal_notes: typeof notes === "string" ? notes.trim() || null : null,
    })
    .eq("id", id);

  revalidatePath("/admin", "layout");
}

/* ══════════════════════════════════════════════════════════════════════
   SITE SETTINGS
   ══════════════════════════════════════════════════════════════════════ */

export async function saveSettingsSection(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = settingsSectionSchema.safeParse(parsePayload(formData));
  if (!parsed.success) return fail("Those settings could not be read. Please try again.");

  try {
    const { error } = await getAdminClient()
      .from("site_settings")
      .upsert({ key: parsed.data.key, value: parsed.data.value }, { onConflict: "key" });

    if (error) return fail("The settings could not be saved.");

    revalidatePath("/", "layout");
    revalidatePath("/admin/settings");
    return succeed("Settings saved. The public site has been updated.");
  } catch {
    return fail("The settings could not be saved.");
  }
}
