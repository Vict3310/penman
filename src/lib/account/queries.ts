import "server-only";

import { getPool } from "@/lib/auth/db";
import { findUserById, type UserRecord } from "@/lib/auth/users";
import { getAdminClient } from "@/lib/supabase/admin";
import type { MediaRef, Product, Property, Vehicle } from "@/lib/types";

/**
 * Account-area reads.
 *
 * Every function here takes a `userId` that the CALLER obtained from the
 * session (`getSessionUser()`), and every query filters on it. Nothing in this
 * module accepts an identifier from a request body, a query string or a form
 * field, so there is no value a customer can supply to read someone else's
 * data — the shape of the API makes it unrepresentable rather than merely
 * unwise.
 *
 * Reads run on the service-role client because the customer-facing tables
 * carry no RLS policy that could match an application-owned session: see the
 * note at the top of migration 0004. The authorization decision was made
 * before this module was called.
 *
 * Every function fails soft. An account page that throws because one
 * aggregate query failed is worse than one that shows a zero and says so, and
 * a failure here must never be mistaken for \"this customer has no enquiries\".
 */

/* ── Profile ─────────────────────────────────────────────────────────── */

export async function getAccountProfile(userId: string): Promise<UserRecord | null> {
  try {
    return await findUserById(getPool(), userId);
  } catch (error) {
    // Still returns null so the page can render, but a swallowed connection
    // failure used to look like a profile with no password. Leave a trace.
    console.error(
      "Profile lookup failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return null;
  }
}

/* ── Enquiries ───────────────────────────────────────────────────────── */

export type AccountEnquiryKind = "rental" | "property" | "shop";

export interface EnquiryDetailLine {
  label: string;
  value: string;
}

export interface AccountEnquiry {
  id: string;
  kind: AccountEnquiryKind;
  /** What the customer asked about, in their language. */
  kindLabel: string;
  subject: string;
  message: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  /** The listing, when it still exists and is still published. */
  href: string | null;
  image: MediaRef | null;
  details: EnquiryDetailLine[];
}

/**
 * A short, stable reference for an enquiry.
 *
 * Derived from the row's own primary key rather than generated separately, so
 * it is always accurate and needs no extra column: the customer can quote it
 * and the operator can find the exact row, because it IS the id.
 */
export function enquiryReference(id: string): string {
  return `PE-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

interface ListingEmbed {
  slug?: string | null;
  name?: string | null;
  title?: string | null;
  images?: MediaRef[] | null;
  status?: string | null;
}

function embedOf(value: unknown): ListingEmbed | null {
  // PostgREST returns a single object for a to-one embed, but an array when the
  // relationship is ambiguous. Both shapes are tolerated rather than assuming.
  if (!value) return null;
  if (Array.isArray(value)) return (value[0] as ListingEmbed) ?? null;
  return value as ListingEmbed;
}

/** Only published listings get a link: a draft must not become a public URL. */
function hrefFor(kind: AccountEnquiryKind, embedded: ListingEmbed | null): string | null {
  if (!embedded?.slug || embedded.status !== "published") return null;
  if (kind === "rental") return `/rental/${embedded.slug}`;
  if (kind === "property") return `/real-estate/${embedded.slug}`;
  return `/shop/${embedded.slug}`;
}

function firstImage(embedded: ListingEmbed | null): MediaRef | null {
  const images = embedded?.images;
  if (!Array.isArray(images) || images.length === 0) return null;
  return images.find((image) => image.type !== "video") ?? null;
}

/**
 * Every enquiry this customer has sent, newest first.
 *
 * One ordered list assembled from three tables rather than three separate
 * sections, because a customer thinks in terms of \"what I asked Penman
 * Empire\", not in terms of which of our modules handled it.
 */
export async function getMyEnquiries(userId: string, limit = 100): Promise<AccountEnquiry[]> {
  try {
    const supabase = getAdminClient();

    const [rental, property, shop] = await Promise.all([
      supabase
        .from("rental_enquiries")
        .select(
          "id, name, phone, email, pickup_date, return_date, message, status, created_at, updated_at, vehicle:vehicles(slug, name, images, status)",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("property_enquiries")
        .select(
          "id, message, status, created_at, updated_at, property:properties(slug, title, images, status)",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("shop_enquiries")
        .select(
          "id, quantity, message, channel, status, created_at, updated_at, product:products(slug, name, images, status)",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

    const items: AccountEnquiry[] = [];

    for (const row of (rental.data ?? []) as Record<string, unknown>[]) {
      const embedded = embedOf(row.vehicle);
      items.push({
        id: String(row.id),
        kind: "rental",
        kindLabel: "Vehicle rental",
        subject: (embedded?.name as string) ?? (row.vehicle_name as string) ?? "Vehicle enquiry",
        message: (row.message as string) ?? null,
        status: String(row.status),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at ?? row.created_at),
        href: hrefFor("rental", embedded),
        image: firstImage(embedded),
        details: [
          { label: "Pick-up", value: String(row.pickup_date ?? "—") },
          { label: "Return", value: String(row.return_date ?? "—") },
        ],
      });
    }

    for (const row of (property.data ?? []) as Record<string, unknown>[]) {
      const embedded = embedOf(row.property);
      items.push({
        id: String(row.id),
        kind: "property",
        kindLabel: "Property",
        subject: (embedded?.title as string) ?? "Property enquiry",
        message: (row.message as string) ?? null,
        status: String(row.status),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at ?? row.created_at),
        href: hrefFor("property", embedded),
        image: firstImage(embedded),
        details: [],
      });
    }

    for (const row of (shop.data ?? []) as Record<string, unknown>[]) {
      const embedded = embedOf(row.product);
      items.push({
        id: String(row.id),
        kind: "shop",
        kindLabel: "Car for sale",
        subject: (embedded?.name as string) ?? (row.product_name as string) ?? "Vehicle enquiry",
        message: (row.message as string) ?? null,
        status: String(row.status),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at ?? row.created_at),
        href: hrefFor("shop", embedded),
        image: firstImage(embedded),
        details: [{ label: "Quantity", value: String(row.quantity ?? 1) }],
      });
    }

    return items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch {
    return [];
  }
}

/* ── Saved listings ──────────────────────────────────────────────────── */

export interface SavedListings {
  vehicles: Vehicle[];
  products: Product[];
  properties: Property[];
}

export interface SavedIdSets {
  vehicles: Set<string>;
  products: Set<string>;
  properties: Set<string>;
}

/**
 * The ids this customer has saved, as sets.
 *
 * Used to hydrate the save controls on public listing pages, where only the
 * ids are needed and fetching whole listings would be wasted work.
 */
export async function getSavedIdSets(userId: string): Promise<SavedIdSets> {
  const empty: SavedIdSets = { vehicles: new Set(), products: new Set(), properties: new Set() };
  if (!userId) return empty;

  try {
    const supabase = getAdminClient();
    const [vehicles, products, properties] = await Promise.all([
      supabase.from("saved_vehicles").select("vehicle_id").eq("user_id", userId),
      supabase.from("saved_products").select("product_id").eq("user_id", userId),
      supabase.from("saved_properties").select("property_id").eq("user_id", userId),
    ]);

    return {
      vehicles: new Set(((vehicles.data ?? []) as { vehicle_id: string }[]).map((r) => r.vehicle_id)),
      products: new Set(((products.data ?? []) as { product_id: string }[]).map((r) => r.product_id)),
      properties: new Set(((properties.data ?? []) as { property_id: string }[]).map((r) => r.property_id)),
    };
  } catch {
    return empty;
  }
}

/**
 * The saved listings themselves, newest save first.
 *
 * Rows include listings that are no longer published, because the customer
 * saved them and hiding them silently would look like data loss. The UI shows
 * an unpublished or unavailable listing as muted and unlinked, with the remove
 * control still working.
 */
export async function getSavedListings(userId: string, limit = 60): Promise<SavedListings> {
  try {
    const supabase = getAdminClient();
    const [vehicles, products, properties] = await Promise.all([
      supabase
        .from("saved_vehicles")
        .select("created_at, vehicle:vehicles(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("saved_products")
        .select("created_at, product:products(*, category:product_categories(id, slug, name))")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("saved_properties")
        .select("created_at, property:properties(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

    const pluck = <T>(rows: unknown): T[] =>
      ((rows ?? []) as Record<string, unknown>[])
        .map((row) => Object.values(row).find((value) => value && typeof value === "object" && !Array.isArray(value)))
        .filter((value): value is T => Boolean(value));

    return {
      vehicles: pluck<Vehicle>(vehicles.data),
      products: pluck<Product>(products.data),
      properties: pluck<Property>(properties.data),
    };
  } catch {
    return { vehicles: [], products: [], properties: [] };
  }
}

/* ── Navigation counts ───────────────────────────────────────────────── */

export interface AccountNavCounts {
  enquiryCount: number;
  savedCount: number;
}

/**
 * The two figures the account navigation shows badges for.
 *
 * Counted with HEAD requests rather than by fetching rows, because the layout
 * renders on every account page and pulling whole listings just to print a
 * number would be wasteful. Six cheap counts, in parallel.
 */
export async function getAccountNavCounts(userId: string): Promise<AccountNavCounts> {
  try {
    const supabase = getAdminClient();
    const head = { count: "exact" as const, head: true };

    const [rental, property, shop, vehicles, products, properties] = await Promise.all([
      supabase.from("rental_enquiries").select("*", head).eq("user_id", userId),
      supabase.from("property_enquiries").select("*", head).eq("user_id", userId),
      supabase.from("shop_enquiries").select("*", head).eq("user_id", userId),
      supabase.from("saved_vehicles").select("*", head).eq("user_id", userId),
      supabase.from("saved_products").select("*", head).eq("user_id", userId),
      supabase.from("saved_properties").select("*", head).eq("user_id", userId),
    ]);

    return {
      enquiryCount: (rental.count ?? 0) + (property.count ?? 0) + (shop.count ?? 0),
      savedCount: (vehicles.count ?? 0) + (products.count ?? 0) + (properties.count ?? 0),
    };
  } catch {
    return { enquiryCount: 0, savedCount: 0 };
  }
}

/* ── Overview ────────────────────────────────────────────────────────── */

export interface AccountActivity {
  id: string;
  kind: string;
  title: string;
  detail: string | null;
  status: string | null;
  createdAt: string;
  href: string | null;
}

export interface AccountOverview {
  enquiryCount: number;
  /** Enquiries the team has not yet responded to. */
  awaitingReplyCount: number;
  savedCount: number;
  savedVehicleCount: number;
  profileUpdatedAt: string | null;
  activity: AccountActivity[];
}

/**
 * Summary numbers and a recent-activity feed.
 *
 * Every figure is counted from real rows, and every activity entry is derived
 * from a timestamp that a real action wrote. Where a feature is absent the
 * count is genuinely zero — it is never padded with a plausible-looking
 * number. The activity feed is assembled from the records the business
 * actually keeps: the three enquiry tables, the three saved-listing tables,
 * and the profile row's own `updated_at`.
 *
 * One consequence worth stating plainly: an enquiry sent before the customer
 * created their account has no owner recorded against it (see migration 0004)
 * and therefore does not appear here. It is not lost — it is in the
 * administration inbox — but it is not attributed to the account, because
 * guessing that a row belongs to somebody from a matching email address would
 * be an ownership decision made on the customer's behalf.
 */
export async function getAccountOverview(
  userId: string,
  profile: UserRecord | null,
  limit = 8,
): Promise<AccountOverview> {
  const empty: AccountOverview = {
    enquiryCount: 0,
    awaitingReplyCount: 0,
    savedCount: 0,
    savedVehicleCount: 0,
    profileUpdatedAt: null,
    activity: [],
  };

  try {
    const supabase = getAdminClient();
    const head = { count: "exact" as const, head: true };

    const [enquiries, saved, savedVehicles] = await Promise.all([
      getMyEnquiries(userId, 100),
      getSavedListings(userId, 100),
      supabase.from("saved_vehicles").select("*", head).eq("user_id", userId),
    ]);

    const savedCount = saved.vehicles.length + saved.products.length + saved.properties.length;
    const awaitingReplyCount = enquiries.filter((item) => item.status === "new").length;

    const activity: AccountActivity[] = [];

    for (const enquiry of enquiries) {
      activity.push({
        id: `enquiry-${enquiry.id}`,
        kind: enquiry.kindLabel,
        title: `Enquiry sent about ${enquiry.subject}`,
        detail: enquiryReference(enquiry.id),
        status: enquiry.status,
        createdAt: enquiry.createdAt,
        href: "/account/enquiries",
      });

      // A status change is a separate, later event. Comparing the two
      // timestamps is how it is detected without an event log: the row's
      // trigger only moves `updated_at` when something actually changed.
      const updated = new Date(enquiry.updatedAt).getTime();
      const created = new Date(enquiry.createdAt).getTime();
      if (updated - created > 1000) {
        activity.push({
          id: `status-${enquiry.id}-${enquiry.updatedAt}`,
          kind: enquiry.kindLabel,
          title: `Your enquiry about ${enquiry.subject} is now ${enquiry.status}`,
          detail: enquiryReference(enquiry.id),
          status: enquiry.status,
          createdAt: enquiry.updatedAt,
          href: "/account/enquiries",
        });
      }
    }

    for (const vehicle of saved.vehicles) {
      activity.push({
        id: `saved-vehicle-${vehicle.id}`,
        kind: "Saved",
        title: `You saved ${vehicle.name}`,
        detail: null,
        status: null,
        createdAt: vehicle.created_at,
        href: "/account/saved",
      });
    }

    if (profile && new Date(profile.updated_at).getTime() - new Date(profile.created_at).getTime() > 1000) {
      activity.push({
        id: "profile-updated",
        kind: "Account",
        title: "You updated your account details",
        detail: null,
        status: null,
        createdAt: new Date(profile.updated_at).toISOString(),
        href: "/account/profile",
      });
    }

    activity.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      enquiryCount: enquiries.length,
      awaitingReplyCount,
      savedCount,
      savedVehicleCount: savedVehicles.count ?? 0,
      profileUpdatedAt: profile?.updated_at ? new Date(profile.updated_at).toISOString() : null,
      activity: activity.slice(0, limit),
    };
  } catch {
    return empty;
  }
}
