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

export interface RentalEnquiry {
  id: string;
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
  category?: Pick<ProductCategory, "id" | "slug" | "name"> | null;
}

export interface ShopEnquiry {
  id: string;
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
