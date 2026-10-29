import "server-only";
import { maybePublicClient } from "@/lib/supabase/public";
import { getAdminClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/demo";
import {
  demoFeaturedProducts,
  demoFeaturedProperties,
  demoFeaturedVehicles,
  demoGetProduct,
  demoGetProperty,
  demoGetVehicle,
  demoListProperties,
  demoListProducts,
  demoListVehicles,
  demoVehicleCategories,
  DEMO_CATEGORIES,
  DEMO_CONTACT_MESSAGES,
  DEMO_PRODUCTS,
  DEMO_PROPERTIES,
  DEMO_PROPERTY_ENQUIRIES,
  DEMO_RENTAL_ENQUIRIES,
  DEMO_SHOP_ENQUIRIES,
  DEMO_VEHICLES,
} from "@/lib/demo-data";
import type { Paginated } from "@/lib/pagination";
import type {
  ContactMessage,
  Product,
  ProductCategory,
  Property,
  PropertyEnquiry,
  RentalEnquiry,
  ShopEnquiry,
  Vehicle,
} from "@/lib/types";

/**
 * Data access layer.
 *   * Public reads  → anon client, RLS restricts to published rows.
 *   * Admin reads   → service-role client, only reachable after an
 *                     authorization check has passed in the caller.
 */

export interface VehicleFilters {
  q?: string;
  category?: string;
  transmission?: string;
  availability?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc";
  page?: number;
  perPage?: number;
}

export interface PropertyFilters {
  q?: string;
  location?: string;
  propertyType?: string;
  listingType?: string;
  bedrooms?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc";
  page?: number;
  perPage?: number;
}

export interface ProductFilters {
  q?: string;
  category?: string;
  make?: string;
  body?: string;
  minYear?: number;
  maxYear?: number;
  maxMileage?: number;
  minPrice?: number;
  maxPrice?: number;
  listing?: "all" | "stock" | "models";
  sort?: "newest" | "price_asc" | "price_desc";
  page?: number;
  perPage?: number;
}

export type { Paginated };

const DEFAULT_PER_PAGE = 12;

function paginate<T>(items: T[], total: number, page: number, perPage: number): Paginated<T> {
  return {
    items,
    total,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  };
}

function empty<T>(page = 1, perPage = DEFAULT_PER_PAGE): Paginated<T> {
  return { items: [], total: 0, page, perPage, pageCount: 1 };
}

/* ══════════════════════════════════════════════════════════════════════
   PUBLIC READS
   ══════════════════════════════════════════════════════════════════════ */

export async function listVehicles(filters: VehicleFilters = {}): Promise<Paginated<Vehicle>> {
  if (isDemoMode()) return demoListVehicles(filters);
  const page = Math.max(1, filters.page ?? 1);
  const perPage = filters.perPage ?? DEFAULT_PER_PAGE;
  const supabase = maybePublicClient();
  if (!supabase) return empty<Vehicle>(page, perPage);

  try {
    let query = supabase
      .from("vehicles")
      .select("*", { count: "exact" })
      .eq("status", "published");

    if (filters.q) query = query.or(`name.ilike.%${filters.q}%,description.ilike.%${filters.q}%`);
    if (filters.category) query = query.eq("category", filters.category);
    if (filters.transmission) query = query.eq("transmission", filters.transmission);
    if (filters.availability) query = query.eq("availability", filters.availability);
    if (filters.minPrice !== undefined) query = query.gte("rate", filters.minPrice);
    if (filters.maxPrice !== undefined) query = query.lte("rate", filters.maxPrice);

    switch (filters.sort) {
      case "price_asc":
        query = query.order("rate", { ascending: true, nullsFirst: false });
        break;
      case "price_desc":
        query = query.order("rate", { ascending: false, nullsFirst: false });
        break;
      default:
        query = query.order("is_featured", { ascending: false }).order("created_at", { ascending: false });
    }

    const from = (page - 1) * perPage;
    const { data, count, error } = await query.range(from, from + perPage - 1);
    if (error) return empty<Vehicle>(page, perPage);
    return paginate((data ?? []) as Vehicle[], count ?? 0, page, perPage);
  } catch {
    return empty<Vehicle>(page, perPage);
  }
}

export async function getVehicleBySlug(slug: string): Promise<Vehicle | null> {
  if (isDemoMode()) return demoGetVehicle(slug);
  const supabase = maybePublicClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) return null;
    return (data as Vehicle | null) ?? null;
  } catch {
    return null;
  }
}

export async function getFeaturedVehicles(limit = 3): Promise<Vehicle[]> {
  if (isDemoMode()) return demoFeaturedVehicles(limit);
  const supabase = maybePublicClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("status", "published")
      .eq("is_featured", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []) as Vehicle[];
  } catch {
    return [];
  }
}

export async function getVehicleCategories(): Promise<string[]> {
  if (isDemoMode()) return demoVehicleCategories();
  const supabase = maybePublicClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("vehicles")
      .select("category")
      .eq("status", "published");
    if (error) return [];
    const set = new Set<string>();
    for (const row of (data ?? []) as { category: string }[]) set.add(row.category);
    return [...set].sort();
  } catch {
    return [];
  }
}

export async function listProperties(filters: PropertyFilters = {}): Promise<Paginated<Property>> {
  if (isDemoMode()) return demoListProperties(filters);
  const page = Math.max(1, filters.page ?? 1);
  const perPage = filters.perPage ?? DEFAULT_PER_PAGE;
  const supabase = maybePublicClient();
  if (!supabase) return empty<Property>(page, perPage);

  try {
    let query = supabase
      .from("properties")
      .select("*", { count: "exact" })
      .eq("status", "published");

    if (filters.q)
      query = query.or(`title.ilike.%${filters.q}%,description.ilike.%${filters.q}%,location.ilike.%${filters.q}%`);
    if (filters.location) query = query.ilike("location", `%${filters.location}%`);
    if (filters.propertyType) query = query.eq("property_type", filters.propertyType);
    if (filters.listingType) query = query.eq("listing_type", filters.listingType).eq("is_reference", false);
    if (filters.bedrooms !== undefined) query = query.gte("bedrooms", filters.bedrooms);
    if (filters.minPrice !== undefined) query = query.gte("price", filters.minPrice);
    if (filters.maxPrice !== undefined) query = query.lte("price", filters.maxPrice);

    switch (filters.sort) {
      case "price_asc":
        query = query.order("price", { ascending: true, nullsFirst: false });
        break;
      case "price_desc":
        query = query.order("price", { ascending: false, nullsFirst: false });
        break;
      default:
        query = query.order("created_at", { ascending: false }).order("is_featured", { ascending: false });
    }

    const from = (page - 1) * perPage;
    const { data, count, error } = await query.range(from, from + perPage - 1);
    if (error) return empty<Property>(page, perPage);
    return paginate((data ?? []) as Property[], count ?? 0, page, perPage);
  } catch {
    return empty<Property>(page, perPage);
  }
}

export async function getPropertyBySlug(slug: string): Promise<Property | null> {
  if (isDemoMode()) return demoGetProperty(slug);
  const supabase = maybePublicClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) return null;
    return (data as Property | null) ?? null;
  } catch {
    return null;
  }
}

export async function getFeaturedProperties(limit = 3): Promise<Property[]> {
  if (isDemoMode()) return demoFeaturedProperties(limit);
  const supabase = maybePublicClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("status", "published")
      .eq("is_featured", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []) as Property[];
  } catch {
    return [];
  }
}

export async function listCategories(): Promise<ProductCategory[]> {
  if (isDemoMode()) return DEMO_CATEGORIES;
  const supabase = maybePublicClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("product_categories")
      .select("*")
      .order("position", { ascending: true });
    if (error) return [];
    return (data ?? []) as ProductCategory[];
  } catch {
    return [];
  }
}

export async function listProducts(filters: ProductFilters = {}): Promise<Paginated<Product>> {
  if (isDemoMode()) return demoListProducts(filters);
  const page = Math.max(1, filters.page ?? 1);
  const perPage = filters.perPage ?? DEFAULT_PER_PAGE;
  const supabase = maybePublicClient();
  if (!supabase) return empty<Product>(page, perPage);

  try {
    let query = supabase
      .from("products")
      .select("*, category:product_categories(id, slug, name)", { count: "exact" })
      .eq("status", "published");

    if (filters.q) query = query.or(`name.ilike.%${filters.q.replace(/[(),.%]/g, "")}%,description.ilike.%${filters.q.replace(/[(),.%]/g, "")}%`);
    if (filters.category) {
      const categories = await listCategories();
      const match = categories.find((c) => c.slug === filters.category);
      if (!match) return empty<Product>(page, perPage);
      query = query.eq("category_id", match.id);
    }
    if (filters.make) query = query.eq("specs->>make", filters.make);
    if (filters.body) query = query.ilike("specs->>body_style", `%${filters.body}%`);
    if (filters.minYear) query = query.gte("specs->>year", String(filters.minYear));
    if (filters.maxYear) query = query.lte("specs->>year", String(filters.maxYear));
    if (filters.maxMileage) query = query.lte("specs->mileage_km", filters.maxMileage);
    if (filters.minPrice) query = query.gte("price", filters.minPrice);
    if (filters.maxPrice) query = query.lte("price", filters.maxPrice);
    if (filters.listing === "stock") query = query.eq("is_reference", false);
    if (filters.listing === "models") query = query.eq("is_reference", true);

    switch (filters.sort) {
      case "price_asc":
        query = query.order("price", { ascending: true, nullsFirst: false });
        break;
      case "price_desc":
        query = query.order("price", { ascending: false, nullsFirst: false });
        break;
      default:
        query = query.order("is_featured", { ascending: false }).order("created_at", { ascending: false });
    }

    const from = (page - 1) * perPage;
    const { data, count, error } = await query.range(from, from + perPage - 1);
    if (error) return empty<Product>(page, perPage);
    return paginate((data ?? []) as Product[], count ?? 0, page, perPage);
  } catch {
    return empty<Product>(page, perPage);
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (isDemoMode()) return demoGetProduct(slug);
  const supabase = maybePublicClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*, category:product_categories(id, slug, name)")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) return null;
    return (data as Product | null) ?? null;
  } catch {
    return null;
  }
}

export async function getFeaturedProducts(limit = 3): Promise<Product[]> {
  if (isDemoMode()) return demoFeaturedProducts(limit);
  const supabase = maybePublicClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*, category:product_categories(id, slug, name)")
      .eq("status", "published")
      .eq("is_featured", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []) as Product[];
  } catch {
    return [];
  }
}

/* ══════════════════════════════════════════════════════════════════════
   ADMIN READS — service role. Callers MUST verify is_admin first.
   ══════════════════════════════════════════════════════════════════════ */

export interface AdminListOptions {
  q?: string;
  status?: string;
  page?: number;
  perPage?: number;
}

function demoAdminList<T>(
  items: T[],
  options: AdminListOptions,
  searchColumns: string[] = [],
): Paginated<T> {
  const page = Math.max(1, options.page ?? 1);
  const perPage = options.perPage ?? 20;

  let filtered = [...items];
  if (options.status) {
    filtered = filtered.filter((item) => {
      const record = item as Record<string, unknown>;
      return record["status"] === options.status;
    });
  }
  if (options.q && searchColumns.length) {
    const needle = options.q.toLowerCase();
    filtered = filtered.filter((item) => {
      const record = item as Record<string, unknown>;
      return searchColumns.some((column) => {
        const value = record[column];
        return typeof value === "string" && value.toLowerCase().includes(needle);
      });
    });
  }

  filtered.sort((a, b) => {
    const recordA = a as Record<string, unknown>;
    const recordB = b as Record<string, unknown>;
    const aDate = new Date(String(recordA["updated_at"] ?? recordA["created_at"] ?? 0)).getTime();
    const bDate = new Date(String(recordB["updated_at"] ?? recordB["created_at"] ?? 0)).getTime();
    return bDate - aDate;
  });

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, pageCount);
  const from = (currentPage - 1) * perPage;

  return {
    items: filtered.slice(from, from + perPage),
    total,
    page: currentPage,
    perPage,
    pageCount,
  };
}

async function adminList<T>(
  table: string,
  options: AdminListOptions,
  searchColumns: string[] = [],
  order = "created_at",
): Promise<Paginated<T>> {
  if (isDemoMode()) {
    const demoTable: Record<string, unknown[]> = {
      vehicles: DEMO_VEHICLES,
      properties: DEMO_PROPERTIES,
      products: DEMO_PRODUCTS,
      rental_enquiries: DEMO_RENTAL_ENQUIRIES,
      property_enquiries: DEMO_PROPERTY_ENQUIRIES,
      shop_enquiries: DEMO_SHOP_ENQUIRIES,
      contact_messages: DEMO_CONTACT_MESSAGES,
    };

    return demoAdminList((demoTable[table] ?? []) as T[], options, searchColumns);
  }

  const page = Math.max(1, options.page ?? 1);
  const perPage = options.perPage ?? 20;
  try {
    const supabase = getAdminClient();
    let query = supabase.from(table).select("*", { count: "exact" });
    if (options.status) query = query.eq("status", options.status);
    if (options.q && searchColumns.length) {
      query = query.or(searchColumns.map((c) => `${c}.ilike.%${options.q}%`).join(","));
    }
    query = query.order(order, { ascending: false });
    const from = (page - 1) * perPage;
    const { data, count, error } = await query.range(from, from + perPage - 1);
    if (error) return empty<T>(page, perPage);
    return paginate((data ?? []) as T[], count ?? 0, page, perPage);
  } catch {
    return empty<T>(page, perPage);
  }
}

export const adminListVehicles = (o: AdminListOptions = {}) =>
  adminList<Vehicle>("vehicles", o, ["name", "category"], "updated_at");

export const adminListProperties = (o: AdminListOptions = {}) =>
  adminList<Property>("properties", o, ["title", "location"], "updated_at");

export const adminListProducts = (o: AdminListOptions = {}) =>
  adminList<Product>("products", o, ["name", "sku"], "updated_at");

export const adminListRentalEnquiries = (o: AdminListOptions = {}) =>
  adminList<RentalEnquiry>("rental_enquiries", o, ["name", "phone", "vehicle_name"], "created_at");

export const adminListPropertyEnquiries = (o: AdminListOptions = {}) =>
  adminList<PropertyEnquiry>("property_enquiries", o, ["name", "phone", "property_title"], "created_at");

export const adminListShopEnquiries = (o: AdminListOptions = {}) =>
  adminList<ShopEnquiry>("shop_enquiries", o, ["name", "phone", "product_name"], "created_at");

export const adminListContactMessages = (o: AdminListOptions = {}) =>
  adminList<ContactMessage>("contact_messages", o, ["name", "phone", "subject"], "created_at");

export async function adminGetVehicle(id: string): Promise<Vehicle | null> {
  try {
    const { data } = await getAdminClient().from("vehicles").select("*").eq("id", id).maybeSingle();
    return (data as Vehicle | null) ?? null;
  } catch {
    return null;
  }
}

export async function adminGetProperty(id: string): Promise<Property | null> {
  try {
    const { data } = await getAdminClient().from("properties").select("*").eq("id", id).maybeSingle();
    return (data as Property | null) ?? null;
  } catch {
    return null;
  }
}

export async function adminGetProduct(id: string): Promise<Product | null> {
  try {
    const { data } = await getAdminClient().from("products").select("*").eq("id", id).maybeSingle();
    return (data as Product | null) ?? null;
  } catch {
    return null;
  }
}

export async function adminListCategories(): Promise<ProductCategory[]> {
  try {
    const { data } = await getAdminClient()
      .from("product_categories")
      .select("*")
      .order("position", { ascending: true });
    return (data ?? []) as ProductCategory[];
  } catch {
    return [];
  }
}

export interface DashboardCounts {
  vehicles: number;
  properties: number;
  products: number;
  newRentalEnquiries: number;
  newPropertyEnquiries: number;
  newShopEnquiries: number;
  newContactMessages: number;
  totalEnquiries: number;
}

/** Real, database-backed dashboard metrics. Never hardcoded. */
export async function adminDashboardCounts(): Promise<DashboardCounts> {
  const zero: DashboardCounts = {
    vehicles: 0,
    properties: 0,
    products: 0,
    newRentalEnquiries: 0,
    newPropertyEnquiries: 0,
    newShopEnquiries: 0,
    newContactMessages: 0,
    totalEnquiries: 0,
  };

  if (isDemoMode()) {
    const vehicles = DEMO_VEHICLES.filter((item) => item.status === "published").length;
    const properties = DEMO_PROPERTIES.filter((item) => item.status === "published").length;
    const products = DEMO_PRODUCTS.filter((item) => item.status === "published").length;
    const counts = {
      vehicles,
      properties,
      products,
      newRentalEnquiries: 2,
      newPropertyEnquiries: 1,
      newShopEnquiries: 3,
      newContactMessages: 2,
    };
    return {
      ...counts,
      totalEnquiries:
        counts.newRentalEnquiries +
        counts.newPropertyEnquiries +
        counts.newShopEnquiries +
        counts.newContactMessages,
    };
  }

  try {
    const supabase = getAdminClient();
    const head = { count: "exact" as const, head: true };

    const [
      vehicles,
      properties,
      products,
      rental,
      property,
      shop,
      contact,
    ] = await Promise.all([
      supabase.from("vehicles").select("*", head).eq("status", "published"),
      supabase.from("properties").select("*", head).eq("status", "published"),
      supabase.from("products").select("*", head).eq("status", "published"),
      supabase.from("rental_enquiries").select("*", head).eq("status", "new"),
      supabase.from("property_enquiries").select("*", head).eq("status", "new"),
      supabase.from("shop_enquiries").select("*", head).eq("status", "new"),
      supabase.from("contact_messages").select("*", head).eq("status", "new"),
    ]);

    const counts = {
      vehicles: vehicles.count ?? 0,
      properties: properties.count ?? 0,
      products: products.count ?? 0,
      newRentalEnquiries: rental.count ?? 0,
      newPropertyEnquiries: property.count ?? 0,
      newShopEnquiries: shop.count ?? 0,
      newContactMessages: contact.count ?? 0,
    };

    return {
      ...counts,
      totalEnquiries:
        counts.newRentalEnquiries +
        counts.newPropertyEnquiries +
        counts.newShopEnquiries +
        counts.newContactMessages,
    };
  } catch {
    return zero;
  }
}

export interface ActivityItem {
  id: string;
  kind: string;
  title: string;
  subtitle: string | null;
  status: string;
  createdAt: string;
}

/** Recent activity feed drawn from the enquiry tables. */
export async function adminRecentActivity(limit = 8): Promise<ActivityItem[]> {
  if (isDemoMode()) {
    const now = new Date();
    const recent = [
      {
        id: "demo-rental-1",
        kind: "Rental enquiry",
        title: "[DEMO] Toyota Corolla 2022",
        subtitle: "Amara O.",
        status: "new",
        createdAt: new Date(now.getTime() - 1.5 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "demo-prop-1",
        kind: "Property enquiry",
        title: "[DEMO] 3-Bedroom Terrace Duplex",
        subtitle: "Daniel C.",
        status: "contacted",
        createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "demo-shop-1",
        kind: "Shop enquiry",
        title: "[DEMO] Premium Home Speaker",
        subtitle: "Grace T.",
        status: "new",
        createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "demo-contact-1",
        kind: "Contact message",
        title: "Request for a vehicle and property quote",
        subtitle: "Ifeanyi K.",
        status: "new",
        createdAt: new Date(now.getTime() - 7 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "demo-rental-2",
        kind: "Rental enquiry",
        title: "[DEMO] Toyota Highlander 2021",
        subtitle: "Nneka S.",
        status: "confirmed",
        createdAt: new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString(),
      },
    ];

    return recent.slice(0, limit).map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      subtitle: item.subtitle,
      status: item.status,
      createdAt: item.createdAt,
    }));
  }

  try {
    const supabase = getAdminClient();
    const [rental, property, shop, contact] = await Promise.all([
      supabase.from("rental_enquiries").select("id, name, vehicle_name, status, created_at").order("created_at", { ascending: false }).limit(limit),
      supabase.from("property_enquiries").select("id, name, property_title, status, created_at").order("created_at", { ascending: false }).limit(limit),
      supabase.from("shop_enquiries").select("id, name, product_name, status, created_at").order("created_at", { ascending: false }).limit(limit),
      supabase.from("contact_messages").select("id, name, subject, status, created_at").order("created_at", { ascending: false }).limit(limit),
    ]);

    const items: ActivityItem[] = [
      ...((rental.data ?? []) as { id: string; name: string; vehicle_name: string | null; status: string; created_at: string }[]).map((r) => ({
        id: r.id,
        kind: "Rental enquiry",
        title: r.vehicle_name ?? "Vehicle",
        subtitle: r.name,
        status: r.status,
        createdAt: r.created_at,
      })),
      ...((property.data ?? []) as { id: string; name: string; property_title: string | null; status: string; created_at: string }[]).map((r) => ({
        id: r.id,
        kind: "Property enquiry",
        title: r.property_title ?? "Property",
        subtitle: r.name,
        status: r.status,
        createdAt: r.created_at,
      })),
      ...((shop.data ?? []) as { id: string; name: string; product_name: string | null; status: string; created_at: string }[]).map((r) => ({
        id: r.id,
        kind: "Shop enquiry",
        title: r.product_name ?? "Product",
        subtitle: r.name,
        status: r.status,
        createdAt: r.created_at,
      })),
      ...((contact.data ?? []) as { id: string; name: string; subject: string; status: string; created_at: string }[]).map((r) => ({
        id: r.id,
        kind: "Contact message",
        title: r.subject,
        subtitle: r.name,
        status: r.status,
        createdAt: r.created_at,
      })),
    ];

    return items
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  } catch {
    return [];
  }
}
