/**
 * Hand-maintained row types mirroring supabase/migrations.
 * Kept explicit (rather than generated) so the repository has no build-time
 * dependency on a live database connection.
 */

export type PublishStatus = "draft" | "published" | "archived";
export type EnquiryStatus = "new" | "contacted" | "confirmed" | "declined" | "closed";
export type ShopEnquiryStatus = "new" | "contacted" | "fulfilled" | "cancelled";
export type ProfileRole = "admin" | "editor" | "viewer";

export const PUBLISH_STATUSES: PublishStatus[] = ["draft", "published", "archived"];
export const ENQUIRY_STATUSES: EnquiryStatus[] = ["new", "contacted", "confirmed", "declined", "closed"];
export const SHOP_ENQUIRY_STATUSES: ShopEnquiryStatus[] = ["new", "contacted", "fulfilled", "cancelled"];

/** An ordered reference to an object in Supabase Storage. Never file bytes. */
export interface MediaRef {
  path: string;
  url: string;
  alt?: string;
}

export type VehicleAvailability = "available" | "unavailable" | "maintenance" | "reserved";
export type Transmission = "automatic" | "manual" | "cvt" | "other";
export type FuelType = "petrol" | "diesel" | "hybrid" | "electric" | "other";
export type RatePeriod = "hour" | "day" | "week" | "month";

export interface Vehicle {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  rate: number | null;
  rate_period: RatePeriod;
  currency: string;
  seats: number | null;
  doors: number | null;
  transmission: Transmission | null;
  fuel_type: FuelType | null;
  year: number | null;
  availability: VehicleAvailability;
  rental_terms: string | null;
  images: MediaRef[];
  is_featured: boolean;
  status: PublishStatus;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * The account that submitted an enquiry, or null.
 *
 * Null is the ordinary case rather than a defect: enquiries are open to
 * anonymous visitors, and every enquiry sent before migration 0004 predates
 * the column entirely. An enquiry is a business record first and an account's
 * possession second, so ownership is optional attribution, never a
 * requirement.
 */
export type EnquiryOwnerId = string | null;

export interface RentalEnquiry {
  id: string;
  user_id: EnquiryOwnerId;
  vehicle_id: string | null;
  vehicle_name: string | null;
  name: string;
  phone: string;
  email: string | null;
  pickup_date: string;
  return_date: string;
  message: string | null;
  status: EnquiryStatus;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ListingType = "sale" | "rent";
export type PropertyType =
  | "house"
  | "apartment"
  | "duplex"
  | "bungalow"
  | "land"
  | "commercial"
  | "other";
export type PriceType = "fixed" | "negotiable" | "on_request";
export type PropertyAvailability = "available" | "reserved" | "sold" | "let";

export interface Property {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  listing_type: ListingType;
  property_type: PropertyType;
  location: string;
  address: string | null;
  price: number | null;
  price_type: PriceType;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  amenities: string[];
  availability: PropertyAvailability;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  images: MediaRef[];
  is_featured: boolean;
  status: PublishStatus;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyEnquiry {
  id: string;
  user_id: EnquiryOwnerId;
  property_id: string | null;
  property_title: string | null;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  status: EnquiryStatus;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

/**
 * Facts about an imported listing that came from its source dataset rather
 * than from hand entry (migration 0005).
 *
 * Every field is optional and a null means the source did not state it — the
 * importer never infers a year, a mileage or a condition to fill a gap.
 */
export interface ProductSpecs {
  year?: number | null;
  mileage_km?: number | null;
  condition?: string | null;
  condition_label?: string | null;
  colour?: string | null;
  make?: string | null;
  model?: string | null;
  region?: string | null;
  state?: string | null;
  area?: string | null;
  /** The dataset's second name column; `name` is the one that matches the image. */
  source_title_alt?: string | null;
  source_price_raw?: string | null;
  source_mileage_raw?: string | null;
  source_row_index?: number | null;
  source_image_path?: string | null;
  /** Marks a historic marketplace listing rather than current Penman stock. */
  historic_listing?: boolean;
  availability_note?: string | null;
  price_note?: string | null;
  imported_by?: string | null;
  /** Hash of what the importer last wrote; a mismatch means a human edited the row. */
  import_hash?: string | null;
  image_stored?: boolean;
  image_problem?: string | null;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  sku: string | null;
  description: string | null;
  price: number | null;
  currency: string;
  category_id: string | null;
  track_stock: boolean;
  stock_quantity: number;
  availability: "available" | "unavailable" | "reserved";
  images: MediaRef[];
  is_featured: boolean;
  status: PublishStatus;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  /** Imported-listing provenance (migration 0005). Null on hand-curated rows. */
  inventory_source?: string | null;
  source_id?: string | null;
  source_url?: string | null;
  imported_at?: string | null;
  specs?: ProductSpecs | null;
  category?: Pick<ProductCategory, "id" | "slug" | "name"> | null;
}

/**
 * True when a listing was imported rather than curated by hand.
 *
 * The UI uses this to say so plainly, and to avoid claiming availability or a
 * current market price for something that is a historic marketplace listing.
 */
export function isImported(product: Pick<Product, "inventory_source" | "imported_at">): boolean {
  return Boolean(product.inventory_source || product.imported_at);
}

export interface ShopEnquiry {
  id: string;
  user_id: EnquiryOwnerId;
  product_id: string | null;
  product_name: string | null;
  name: string;
  phone: string;
  email: string | null;
  quantity: number;
  message: string | null;
  channel: "form" | "whatsapp";
  status: ShopEnquiryStatus;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  subject: string;
  message: string;
  status: EnquiryStatus;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: ProfileRole;
  created_at: string;
  updated_at: string;
}

/**
 * Saved-listing rows (migration 0004).
 *
 * One table per listing type, so each carries a real foreign key to the row it
 * refers to. `UNIQUE (user_id, <listing>_id)` in the database is what makes a
 * duplicate save impossible, and `ON DELETE CASCADE` is what makes a removed
 * listing disappear from the account page on its own.
 */
export interface SavedVehicle {
  id: string;
  user_id: string;
  vehicle_id: string;
  created_at: string;
}

export interface SavedProduct {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

export interface SavedProperty {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
}

/** The three listing types a customer can save, in the order the UI shows them. */
export type SavedKind = "vehicle" | "product" | "property";
