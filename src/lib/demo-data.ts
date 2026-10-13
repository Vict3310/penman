import "server-only";

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
import type { ProductFilters, PropertyFilters, VehicleFilters } from "@/lib/queries";
import type { SiteSettings } from "@/lib/site";

/**
 * ⚠️  DEMONSTRATION DATA — DEVELOPMENT ONLY.
 *
 * Every record here mirrors supabase/seed.sql and is labelled `[DEMO]`. These
 * records exist purely so the design can be reviewed before a Supabase project
 * is connected. They must never appear on a live site: see `isDemoMode()`.
 *
 * Nothing in this file invents real business facts — contact details use the
 * reserved `.example` domain and an obviously fake phone number.
 */

const IMG = (seed: string) => `https://picsum.photos/seed/${seed}/1200/900`;
const IMG_SQ = (seed: string) => `https://picsum.photos/seed/${seed}/1000/1000`;

function images(slug: string, count: number, alt: string) {
  return Array.from({ length: count }, (_, i) => ({
    path: `${slug}/${i + 1}.jpg`,
    url: IMG(`${slug}-${i + 1}`),
    alt: `${alt} — image ${i + 1}`,
  }));
}

function productImages(slug: string, count: number, alt: string) {
  return Array.from({ length: count }, (_, i) => ({
    path: `${slug}/${i + 1}.jpg`,
    url: IMG_SQ(`${slug}-${i + 1}`),
    alt: `${alt} — image ${i + 1}`,
  }));
}

const now = new Date("2026-01-15T09:00:00.000Z");
const iso = (daysAgo: number) =>
  new Date(now.getTime() - daysAgo * 86_400_000).toISOString();

/* ── Categories ──────────────────────────────────────────────────────── */

export const DEMO_CATEGORIES: ProductCategory[] = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    slug: "accessories",
    name: "Accessories",
    description: "Vehicle add-ons and convenience items.",
    position: 1,
    created_at: iso(30),
    updated_at: iso(30),
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    slug: "car-care",
    name: "Car Care",
    description: "Cleaning, detailing and upkeep essentials.",
    position: 2,
    created_at: iso(30),
    updated_at: iso(30),
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    slug: "home-living",
    name: "Home & Living",
    description: "Useful everyday products for home and office life.",
    position: 3,
    created_at: iso(30),
    updated_at: iso(30),
  },
  {
    id: "20000000-0000-4000-8000-000000000004",
    slug: "sedans",
    name: "Sedans",
    description: "Comfortable everyday saloons for city and highway driving.",
    position: 4,
    created_at: iso(29),
    updated_at: iso(29),
  },
  {
    id: "20000000-0000-4000-8000-000000000005",
    slug: "suvs",
    name: "SUVs",
    description: "Spacious, high-riding vehicles for family and executive use.",
    position: 5,
    created_at: iso(29),
    updated_at: iso(29),
  },
  {
    id: "20000000-0000-4000-8000-000000000006",
    slug: "luxury",
    name: "Luxury",
    description: "Premium flagship vehicles with upgraded interiors and features.",
    position: 6,
    created_at: iso(29),
    updated_at: iso(29),
  },
];

/* ── Vehicles ────────────────────────────────────────────────────────── */

export const DEMO_VEHICLES: Vehicle[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    slug: "demo-toyota-corolla-2022",
    name: "[DEMO] Toyota Corolla 2022",
    category: "Sedan",
    description:
      "[DEMO] Placeholder listing. A dependable, fuel-efficient saloon suited to city and intercity travel, with air conditioning and a full service history.",
    rate: 45000,
    rate_period: "day",
    currency: "NGN",
    seats: 5,
    doors: 4,
    transmission: "automatic",
    fuel_type: "petrol",
    year: 2022,
    availability: "available",
    rental_terms:
      "[DEMO] Valid identification and a refundable deposit are required. Fuel is not included. Mileage is unlimited within the state.",
    images: images("pe-car-corolla", 3, "[DEMO] Toyota Corolla"),
    is_featured: true,
    status: "published",
    seo_title: null,
    seo_description: null,
    published_at: iso(20),
    created_at: iso(20),
    updated_at: iso(2),
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    slug: "demo-toyota-hiace-bus",
    name: "[DEMO] Toyota Hiace Bus",
    category: "Bus",
    description:
      "[DEMO] Placeholder listing. A 14-seater bus suited to group travel, staff movement and events, with generous luggage space.",
    rate: 85000,
    rate_period: "day",
    currency: "NGN",
    seats: 14,
    doors: 5,
    transmission: "manual",
    fuel_type: "diesel",
    year: 2019,
    availability: "available",
    rental_terms:
      "[DEMO] A driver can be provided on request at an additional cost. Fuel is not included.",
    images: images("pe-car-hiace", 2, "[DEMO] Toyota Hiace Bus"),
    is_featured: true,
    status: "published",
    seo_title: null,
    seo_description: null,
    published_at: iso(18),
    created_at: iso(18),
    updated_at: iso(3),
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    slug: "demo-toyota-highlander-2021",
    name: "[DEMO] Toyota Highlander 2021",
    category: "SUV",
    description:
      "[DEMO] Placeholder listing. A spacious seven-seat SUV for family and executive travel, with leather interior and rear climate control.",
    rate: 120000,
    rate_period: "day",
    currency: "NGN",
    seats: 7,
    doors: 5,
    transmission: "automatic",
    fuel_type: "petrol",
    year: 2021,
    availability: "available",
    rental_terms: "[DEMO] Deposit required. Fuel is not included.",
    images: images("pe-car-highlander", 3, "[DEMO] Toyota Highlander"),
    is_featured: true,
    status: "published",
    seo_title: null,
    seo_description: null,
    published_at: iso(15),
    created_at: iso(15),
    updated_at: iso(1),
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    slug: "demo-honda-accord-2020",
    name: "[DEMO] Honda Accord 2020",
    category: "Sedan",
    description:
      "[DEMO] Placeholder listing. A comfortable saloon with a quiet cabin, well suited to airport transfers and corporate use.",
    rate: 55000,
    rate_period: "day",
    currency: "NGN",
    seats: 5,
    doors: 4,
    transmission: "automatic",
    fuel_type: "petrol",
    year: 2020,
    availability: "available",
    rental_terms: "[DEMO] Deposit required.",
    images: images("pe-car-accord", 2, "[DEMO] Honda Accord"),
    is_featured: false,
    status: "published",
    seo_title: null,
    seo_description: null,
    published_at: iso(12),
    created_at: iso(12),
    updated_at: iso(4),
  },
  {
    id: "10000000-0000-4000-8000-000000000005",
    slug: "demo-ford-transit-van",
    name: "[DEMO] Ford Transit Van",
    category: "Van",
    description:
      "[DEMO] Placeholder listing. A panel van for deliveries and equipment transport, with a high roof and rear barn doors.",
    rate: 70000,
    rate_period: "day",
    currency: "NGN",
    seats: 3,
    doors: 4,
    transmission: "manual",
    fuel_type: "diesel",
    year: 2020,
    availability: "maintenance",
    rental_terms: "[DEMO] Currently off the road for scheduled servicing.",
    images: images("pe-car-transit", 2, "[DEMO] Ford Transit Van"),
    is_featured: false,
    status: "published",
    seo_title: null,
    seo_description: null,
    published_at: iso(10),
    created_at: iso(10),
    updated_at: iso(1),
  },
  {
    id: "10000000-0000-4000-8000-000000000006",
    slug: "demo-kia-rio-2019",
    name: "[DEMO] Kia Rio 2019",
    category: "Sedan",
    description:
      "[DEMO] Placeholder listing. A compact, economical saloon for short trips and daily hire.",
    rate: null,
    rate_period: "day",
    currency: "NGN",
    seats: 5,
    doors: 4,
    transmission: "manual",
    fuel_type: "petrol",
    year: 2019,
    availability: "available",
    rental_terms: "[DEMO] Rate on request for this vehicle.",
    images: images("pe-car-rio", 1, "[DEMO] Kia Rio"),
    is_featured: false,
    status: "published",
    seo_title: null,
    seo_description: null,
    published_at: iso(8),
    created_at: iso(8),
    updated_at: iso(6),
  },
];

/* ── Properties ──────────────────────────────────────────────────────── */

export const DEMO_PROPERTIES: Property[] = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    slug: "demo-3-bedroom-terrace-duplex",
    title: "[DEMO] 3-Bedroom Terrace Duplex",
    description:
      "[DEMO] Placeholder listing. A modern terrace duplex with an open-plan living area, fitted kitchen and a private rear garden.",
    listing_type: "sale",
    property_type: "duplex",
    location: "[DEMO] Sample District",
    address: "[DEMO] Example Close, Sample District",
    price: 85_000_000,
    price_type: "negotiable",
    currency: "NGN",
    bedrooms: 3,
    bathrooms: 4,
    area_sqm: 220,
    amenities: [
      "[DEMO] Fitted kitchen",
      "[DEMO] Borehole",
      "[DEMO] 24/7 power",
      "[DEMO] Private parking",
      "[DEMO] Gated estate",
    ],
    availability: "available",
    contact_name: null,
    contact_phone: null,
    contact_email: null,
    images: images("pe-prop-terrace", 4, "[DEMO] Terrace duplex"),
    is_featured: true,
    status: "published",
    seo_title: null,
    seo_description: null,
    published_at: iso(22),
    created_at: iso(22),
    updated_at: iso(2),
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    slug: "demo-2-bedroom-apartment-let",
    title: "[DEMO] 2-Bedroom Serviced Apartment",
    description:
      "[DEMO] Placeholder listing. A serviced apartment available to let annually, with parking and 24-hour power.",
    listing_type: "rent",
    property_type: "apartment",
    location: "[DEMO] Sample District",
    address: "[DEMO] Example Avenue, Sample District",
    price: 4_500_000,
    price_type: "fixed",
    currency: "NGN",
    bedrooms: 2,
    bathrooms: 2,
    area_sqm: 110,
    amenities: ["[DEMO] Serviced", "[DEMO] Parking", "[DEMO] 24/7 power"],
    availability: "available",
    contact_name: null,
    contact_phone: null,
    contact_email: null,
    images: images("pe-prop-apartment", 3, "[DEMO] Serviced apartment"),
    is_featured: true,
    status: "published",
    seo_title: null,
    seo_description: null,
    published_at: iso(20),
    created_at: iso(20),
    updated_at: iso(3),
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    slug: "demo-commercial-plot",
    title: "[DEMO] Commercial Plot, 1,000 m²",
    description:
      "[DEMO] Placeholder listing. A fenced commercial parcel with title documents available for inspection.",
    listing_type: "sale",
    property_type: "land",
    location: "[DEMO] Sample District",
    address: null,
    price: null,
    price_type: "on_request",
    currency: "NGN",
    bedrooms: null,
    bathrooms: null,
    area_sqm: 1000,
    amenities: ["[DEMO] Fenced", "[DEMO] Title documents"],
    availability: "available",
    contact_name: null,
    contact_phone: null,
    contact_email: null,
    images: images("pe-prop-plot", 2, "[DEMO] Commercial plot"),
    is_featured: false,
    status: "published",
    seo_title: null,
    seo_description: null,
    published_at: iso(16),
    created_at: iso(16),
    updated_at: iso(5),
  },
  {
    id: "30000000-0000-4000-8000-000000000004",
    slug: "demo-4-bedroom-detached-house",
    title: "[DEMO] 4-Bedroom Detached House",
    description:
      "[DEMO] Placeholder listing. A detached family house on a quiet street, with a boys' quarters and a large compound.",
    listing_type: "sale",
    property_type: "house",
    location: "[DEMO] Sample District",
    address: "[DEMO] Example Street, Sample District",
    price: 145_000_000,
    price_type: "fixed",
    currency: "NGN",
    bedrooms: 4,
    bathrooms: 5,
    area_sqm: 380,
    amenities: ["[DEMO] Boys' quarters", "[DEMO] Large compound", "[DEMO] Borehole"],
    availability: "available",
    contact_name: null,
    contact_phone: null,
    contact_email: null,
    images: images("pe-prop-detached", 3, "[DEMO] Detached house"),
    is_featured: false,
    status: "published",
    seo_title: null,
    seo_description: null,
    published_at: iso(14),
    created_at: iso(14),
    updated_at: iso(7),
  },
  {
    id: "30000000-0000-4000-8000-000000000005",
    slug: "demo-1-bedroom-flat-let",
    title: "[DEMO] 1-Bedroom Flat to Let",
    description:
      "[DEMO] Placeholder listing. A compact flat suited to a single occupant, available on an annual let.",
    listing_type: "rent",
    property_type: "apartment",
    location: "[DEMO] Sample District",
    address: null,
    price: 2_200_000,
    price_type: "negotiable",
    currency: "NGN",
    bedrooms: 1,
    bathrooms: 1,
    area_sqm: 62,
    amenities: ["[DEMO] Prepaid meter", "[DEMO] Secure gate"],
    availability: "reserved",
    contact_name: null,
    contact_phone: null,
    contact_email: null,
    images: images("pe-prop-flat", 2, "[DEMO] One-bedroom flat"),
    is_featured: false,
    status: "published",
    seo_title: null,
    seo_description: null,
    published_at: iso(9),
    created_at: iso(9),
    updated_at: iso(1),
  },
];

/* ── Products ────────────────────────────────────────────────────────── */

const cat = (slug: string) =>
  DEMO_CATEGORIES.find((c) => c.slug === slug) ?? null;

export const DEMO_PRODUCTS: Product[] = [
  {
    id: "40000000-0000-4000-8000-000000000001",
    slug: "demo-dash-camera",
    name: "[DEMO] Full HD Dash Camera",
    sku: "PE-DEMO-002",
    description:
      "[DEMO] A practical add-on for extra visibility and safer driving, with loop recording and night mode.",
    price: 68_000,
    currency: "NGN",
    category_id: DEMO_CATEGORIES[0]!.id,
    track_stock: true,
    stock_quantity: 12,
    availability: "available",
    images: productImages("pe-prod-dashcam", 2, "[DEMO] Dash camera"),
    is_featured: true,
    status: "published",
    seo_title: null,
    seo_description: null,
    published_at: iso(19),
    created_at: iso(19),
    updated_at: iso(4),
    category: cat("accessories"),
  },
  {
    id: "40000000-0000-4000-8000-000000000002",
    slug: "demo-toyota-corolla-2023",
    name: "[DEMO] Toyota Corolla 2023",
    sku: "PE-DEMO-001",
    description:
      "[DEMO] A clean 2023 Corolla with automatic transmission, service history, AC, and a smooth city-to-highway driving profile.",
    price: 10_500_000,
    currency: "NGN",
    category_id: DEMO_CATEGORIES[3]!.id,
    track_stock: false,
    stock_quantity: 0,
    availability: "available",
    images: productImages("pe-prod-corolla", 2, "[DEMO] Toyota Corolla"),
    is_featured: true,
    status: "published",
    seo_title: null,
    seo_description: null,
    published_at: iso(21),
    created_at: iso(21),
    updated_at: iso(2),
    category: cat("sedans"),
  },
  {
    id: "40000000-0000-4000-8000-000000000003",
    slug: "demo-honda-cr-v-2022",
    name: "[DEMO] Honda CR-V 2022",
    sku: "PE-DEMO-003",
    description:
      "[DEMO] A well-kept SUV with a spacious cabin, smart key, reverse camera, and excellent fuel efficiency for everyday family driving.",
    price: 14_800_000,
    currency: "NGN",
    category_id: DEMO_CATEGORIES[4]!.id,
    track_stock: true,
    stock_quantity: 2,
    availability: "available",
    images: productImages("pe-prod-crv", 2, "[DEMO] Honda CR-V"),
    is_featured: true,
    status: "published",
    seo_title: null,
    seo_description: null,
    published_at: iso(19),
    created_at: iso(19),
    updated_at: iso(4),
    category: cat("suvs"),
  },
  {
    id: "40000000-0000-4000-8000-000000000004",
    slug: "demo-mercedes-c-class-2021",
    name: "[DEMO] Mercedes C-Class 2021",
    sku: "PE-DEMO-004",
    description:
      "[DEMO] A premium executive saloon with leather trim, panoramic roof, and a polished finish suited to buyers who want comfort and presence.",
    price: 19_500_000,
    currency: "NGN",
    category_id: DEMO_CATEGORIES[5]!.id,
    track_stock: true,
    stock_quantity: 1,
    availability: "reserved",
    images: productImages("pe-prod-cclass", 2, "[DEMO] Mercedes C-Class"),
    is_featured: true,
    status: "published",
    seo_title: null,
    seo_description: null,
    published_at: iso(17),
    created_at: iso(17),
    updated_at: iso(3),
    category: cat("luxury"),
  },
  {
    id: "40000000-0000-4000-8000-000000000005",
    slug: "demo-toyota-hilux-2022",
    name: "[DEMO] Toyota Hilux 2022",
    sku: "PE-DEMO-005",
    description:
      "[DEMO] A strong, dependable pickup with a powerful engine, durable interior, and excellent utility for commercial or personal use.",
    price: 16_200_000,
    currency: "NGN",
    category_id: DEMO_CATEGORIES[4]!.id,
    track_stock: false,
    stock_quantity: 0,
    availability: "available",
    images: productImages("pe-prod-hilux", 1, "[DEMO] Toyota Hilux"),
    is_featured: false,
    status: "published",
    seo_title: null,
    seo_description: null,
    published_at: iso(11),
    created_at: iso(11),
    updated_at: iso(6),
    category: cat("suvs"),
  },
  {
    id: "40000000-0000-4000-8000-000000000006",
    slug: "demo-lexus-rx-350-2021",
    name: "[DEMO] Lexus RX 350 2021",
    sku: "PE-DEMO-006",
    description:
      "[DEMO] A refined luxury SUV with leather seats, adaptive headlights, and a quiet cabin designed for premium everyday comfort.",
    price: 21_000_000,
    currency: "NGN",
    category_id: DEMO_CATEGORIES[5]!.id,
    track_stock: true,
    stock_quantity: 1,
    availability: "available",
    images: productImages("pe-prod-lexus", 2, "[DEMO] Lexus RX 350"),
    is_featured: false,
    status: "published",
    seo_title: null,
    seo_description: null,
    published_at: iso(7),
    created_at: iso(7),
    updated_at: iso(5),
    category: cat("luxury"),
  },
  {
    id: "40000000-0000-4000-8000-000000000007",
    slug: "demo-car-care-kit",
    name: "[DEMO] Complete Car Care Kit",
    sku: "PE-DEMO-007",
    description:
      "[DEMO] An interior and exterior care bundle designed to keep a new vehicle looking and feeling premium.",
    price: 25_000,
    currency: "NGN",
    category_id: DEMO_CATEGORIES[1]!.id,
    track_stock: true,
    stock_quantity: 20,
    availability: "available",
    images: productImages("pe-prod-care-kit", 2, "[DEMO] Car care kit"),
    is_featured: false,
    status: "published",
    seo_title: null,
    seo_description: null,
    published_at: iso(21),
    created_at: iso(21),
    updated_at: iso(2),
    category: cat("car-care"),
  },
  {
    id: "40000000-0000-4000-8000-000000000008",
    slug: "demo-kia-sportage-2023",
    name: "[DEMO] Kia Sportage 2023",
    sku: "PE-DEMO-008",
    description:
      "[DEMO] A modern SUV with a bold look, touchscreen infotainment, safety features, and room for a growing family.",
    price: 13_100_000,
    currency: "NGN",
    category_id: DEMO_CATEGORIES[4]!.id,
    track_stock: true,
    stock_quantity: 3,
    availability: "available",
    images: productImages("pe-prod-sportage", 1, "[DEMO] Kia Sportage"),
    is_featured: false,
    status: "published",
    seo_title: null,
    seo_description: null,
    published_at: iso(5),
    created_at: iso(5),
    updated_at: iso(5),
    category: cat("suvs"),
  },
];

export const DEMO_RENTAL_ENQUIRIES: RentalEnquiry[] = [
  {
    id: "50000000-0000-4000-8000-000000000001",
    vehicle_id: DEMO_VEHICLES[0]!.id,
    vehicle_name: DEMO_VEHICLES[0]!.name,
    name: "Amara Okafor",
    phone: "+234 801 000 0001",
    email: "amara@example.com",
    pickup_date: iso(1),
    return_date: iso(4),
    message: "We need a dependable car for a 3-day business trip and would like to confirm the rate and insurance coverage.",
    status: "new",
    internal_notes: null,
    created_at: iso(1),
    updated_at: iso(1),
  },
  {
    id: "50000000-0000-4000-8000-000000000002",
    vehicle_id: DEMO_VEHICLES[2]!.id,
    vehicle_name: DEMO_VEHICLES[2]!.name,
    name: "Nneka Solomon",
    phone: "+234 802 000 0002",
    email: "nneka@example.com",
    pickup_date: iso(4),
    return_date: iso(10),
    message: "Could we get a driver for the Highlander as well as a pickup time for this weekend?",
    status: "contacted",
    internal_notes: "Quoted driver package and awaiting confirmation.",
    created_at: iso(4),
    updated_at: iso(3),
  },
  {
    id: "50000000-0000-4000-8000-000000000003",
    vehicle_id: DEMO_VEHICLES[4]!.id,
    vehicle_name: DEMO_VEHICLES[4]!.name,
    name: "Daniel Eze",
    phone: "+234 803 000 0003",
    email: "daniel@example.com",
    pickup_date: iso(7),
    return_date: iso(9),
    message: "I am looking for a van for a one-week delivery run. Please share the terms and deposit requirement.",
    status: "confirmed",
    internal_notes: "Customer confirmed and deposit requested.",
    created_at: iso(7),
    updated_at: iso(2),
  },
];

export const DEMO_PROPERTY_ENQUIRIES: PropertyEnquiry[] = [
  {
    id: "60000000-0000-4000-8000-000000000001",
    property_id: DEMO_PROPERTIES[0]!.id,
    property_title: DEMO_PROPERTIES[0]!.title,
    name: "Mabel Adeyemi",
    phone: "+234 804 000 0004",
    email: "mabel@example.com",
    message: "Could you share the full price list and whether there are additional closing costs for this duplex?",
    status: "new",
    internal_notes: null,
    created_at: iso(2),
    updated_at: iso(2),
  },
  {
    id: "60000000-0000-4000-8000-000000000002",
    property_id: DEMO_PROPERTIES[1]!.id,
    property_title: DEMO_PROPERTIES[1]!.title,
    name: "Ifeanyi Okoye",
    phone: "+234 805 000 0005",
    email: "ifeanyi@example.com",
    message: "I am interested in the serviced apartment and would like to know if it is available for an annual let.",
    status: "contacted",
    internal_notes: "Responded with payment schedule and inspection time.",
    created_at: iso(5),
    updated_at: iso(4),
  },
  {
    id: "60000000-0000-4000-8000-000000000003",
    property_id: DEMO_PROPERTIES[3]!.id,
    property_title: DEMO_PROPERTIES[3]!.title,
    name: "Grace Thompson",
    phone: "+234 806 000 0006",
    email: "grace@example.com",
    message: "Please let me know if the detached house is still available and what inspection slots are open.",
    status: "new",
    internal_notes: null,
    created_at: iso(8),
    updated_at: iso(8),
  },
];

export const DEMO_SHOP_ENQUIRIES: ShopEnquiry[] = [
  {
    id: "70000000-0000-4000-8000-000000000001",
    product_id: DEMO_PRODUCTS[1]!.id,
    product_name: DEMO_PRODUCTS[1]!.name,
    name: "Tosin Adebayo",
    phone: "+234 807 000 0007",
    email: "tosin@example.com",
    quantity: 2,
    message: "Hello, is this dash camera available in stock and can it be delivered this week?",
    channel: "form",
    status: "new",
    internal_notes: null,
    created_at: iso(3),
    updated_at: iso(3),
  },
  {
    id: "70000000-0000-4000-8000-000000000002",
    product_id: DEMO_PRODUCTS[4]!.id,
    product_name: DEMO_PRODUCTS[4]!.name,
    name: "Chinedu Nnaji",
    phone: "+234 808 000 0008",
    email: "chinedu@example.com",
    quantity: 1,
    message: "Please let me know whether the tyre inflator supports 12V charging and the price total.",
    channel: "whatsapp",
    status: "contacted",
    internal_notes: "Shared shipping and charging details.",
    created_at: iso(6),
    updated_at: iso(5),
  },
  {
    id: "70000000-0000-4000-8000-000000000003",
    product_id: DEMO_PRODUCTS[0]!.id,
    product_name: DEMO_PRODUCTS[0]!.name,
    name: "Ada Okafor",
    phone: "+234 809 000 0009",
    email: "ada@example.com",
    quantity: 3,
    message: "I want to order multiple car care kits for our office. Do you offer a bulk discount?",
    channel: "form",
    status: "fulfilled",
    internal_notes: "Bulk order completed and receipt shared.",
    created_at: iso(9),
    updated_at: iso(1),
  },
];

export const DEMO_CONTACT_MESSAGES: ContactMessage[] = [
  {
    id: "80000000-0000-4000-8000-000000000001",
    name: "Kehinde Okafor",
    phone: "+234 810 000 0010",
    email: "kehinde@example.com",
    subject: "Need a vehicle for a wedding transfer",
    message: "We need a clean 5-seater option for transportation between churches and the venue. Please send options.",
    status: "new",
    internal_notes: null,
    created_at: iso(1),
    updated_at: iso(1),
  },
  {
    id: "80000000-0000-4000-8000-000000000002",
    name: "Sonia Adepoju",
    phone: "+234 811 000 0011",
    email: "sonia@example.com",
    subject: "Property investment enquiry",
    message: "I am exploring opportunities for a residential property investment and would like to be contacted by an agent.",
    status: "contacted",
    internal_notes: "Sent brochure and arranged a call-back.",
    created_at: iso(4),
    updated_at: iso(3),
  },
  {
    id: "80000000-0000-4000-8000-000000000003",
    name: "Emeka Orji",
    phone: "+234 812 000 0012",
    email: "emeka@example.com",
    subject: "Product availability question",
    message: "Do you have the water dispenser in stock. I would like to know if it can be collected from your office.",
    status: "new",
    internal_notes: null,
    created_at: iso(6),
    updated_at: iso(6),
  },
];

/* ── Demo site settings ──────────────────────────────────────────────── */

/**
 * Contact values use the reserved `.example` domain and a deliberately
 * non-dialable number, so they can never be mistaken for real contact details.
 */
export const DEMO_SETTINGS: SiteSettings = {
  brand: {
    business_name: "Penman Empire",
    tagline: "Automobiles. Real estate. Cars for sale.",
    logo_url: null,
  },
  contact: {
    phone: "+234 000 000 0000",
    whatsapp: "2340000000000",
    email: "hello@penmanempire.example",
    address: "[DEMO] Business address to be supplied",
    hours: "[DEMO] Mon–Sat, 9am–6pm",
  },
  social: {
    instagram: "https://instagram.com/example",
    facebook: "",
    x: "",
    linkedin: null,
  },
  hero: {
    eyebrow: "Penman Empire — one brand, three businesses",
    heading: "Cars, property and rental",
    heading_emphasis: "solutions under one roof.",
    subheading:
      "Find a rental, discover a vehicle to buy, or browse a property with the same trusted team handling every step.",
    primary_cta_label: "Explore vehicles",
    primary_cta_href: "/rental",
  },
  about: {
    heading: "Built on trust",
    body:
      "Penman Empire operates across automobile rental, vehicle sales and real estate. We keep the same standard across all three: clear pricing, honest communication and dependable service.",
  },
  footer: { note: "[DEMO] Footer note to be supplied by the business owner." },
  seo: {
    default_title: "Penman Empire — Car Rental, Car Sales & Real Estate",
    default_description:
      "Automobile rentals, car sales and real estate listings from one trusted brand. Demonstration content shown.",
    keywords: "",
  },
};

/* ── Query helpers ───────────────────────────────────────────────────── */

const PER_PAGE = 12;

function page<T>(items: T[], pageNumber: number, perPage: number): Paginated<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / perPage));
  // Clamp so a hand-edited or stale ?page= lands on the last real page
  // instead of showing an empty result.
  const current = Math.min(Math.max(1, pageNumber), pageCount);
  return {
    items: items.slice((current - 1) * perPage, current * perPage),
    total: items.length,
    page: current,
    perPage,
    pageCount,
  };
}

function byPrice<T extends { price?: number | null; rate?: number | null }>(
  items: T[],
  direction: "asc" | "desc",
  field: "price" | "rate",
) {
  const sign = direction === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    // Records without a price always sort last, regardless of direction.
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    return (av - bv) * sign;
  });
}

function newest<T extends { created_at: string; is_featured: boolean }>(items: T[]) {
  return [...items].sort((a, b) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function demoListVehicles(filters: VehicleFilters = {}): Paginated<Vehicle> {
  const perPage = filters.perPage ?? PER_PAGE;
  let items = DEMO_VEHICLES.filter((v) => v.status === "published");

  if (filters.q) {
    const needle = filters.q.toLowerCase();
    items = items.filter(
      (v) =>
        v.name.toLowerCase().includes(needle) ||
        (v.description ?? "").toLowerCase().includes(needle),
    );
  }
  if (filters.category) items = items.filter((v) => v.category === filters.category);
  if (filters.transmission) items = items.filter((v) => v.transmission === filters.transmission);
  if (filters.availability) items = items.filter((v) => v.availability === filters.availability);
  if (filters.minPrice !== undefined)
    items = items.filter((v) => v.rate !== null && v.rate >= filters.minPrice!);
  if (filters.maxPrice !== undefined)
    items = items.filter((v) => v.rate !== null && v.rate <= filters.maxPrice!);

  items =
    filters.sort === "price_asc"
      ? byPrice(items, "asc", "rate")
      : filters.sort === "price_desc"
        ? byPrice(items, "desc", "rate")
        : newest(items);

  return page(items, Math.max(1, filters.page ?? 1), perPage);
}

export function demoGetVehicle(slug: string): Vehicle | null {
  return DEMO_VEHICLES.find((v) => v.slug === slug && v.status === "published") ?? null;
}

export function demoFeaturedVehicles(limit: number): Vehicle[] {
  return newest(DEMO_VEHICLES.filter((v) => v.status === "published" && v.is_featured)).slice(0, limit);
}

export function demoVehicleCategories(): string[] {
  return [...new Set(DEMO_VEHICLES.filter((v) => v.status === "published").map((v) => v.category))].sort();
}

export function demoListProperties(filters: PropertyFilters = {}): Paginated<Property> {
  const perPage = filters.perPage ?? PER_PAGE;
  let items = DEMO_PROPERTIES.filter((p) => p.status === "published");

  if (filters.q) {
    const needle = filters.q.toLowerCase();
    items = items.filter(
      (p) =>
        p.title.toLowerCase().includes(needle) ||
        (p.description ?? "").toLowerCase().includes(needle) ||
        p.location.toLowerCase().includes(needle),
    );
  }
  if (filters.location)
    items = items.filter((p) => p.location.toLowerCase().includes(filters.location!.toLowerCase()));
  if (filters.propertyType) items = items.filter((p) => p.property_type === filters.propertyType);
  if (filters.listingType) items = items.filter((p) => p.listing_type === filters.listingType);
  if (filters.bedrooms !== undefined)
    items = items.filter((p) => p.bedrooms !== null && p.bedrooms >= filters.bedrooms!);
  if (filters.minPrice !== undefined)
    items = items.filter((p) => p.price !== null && p.price >= filters.minPrice!);
  if (filters.maxPrice !== undefined)
    items = items.filter((p) => p.price !== null && p.price <= filters.maxPrice!);

  items =
    filters.sort === "price_asc"
      ? byPrice(items, "asc", "price")
      : filters.sort === "price_desc"
        ? byPrice(items, "desc", "price")
        : newest(items);

  return page(items, Math.max(1, filters.page ?? 1), perPage);
}

export function demoGetProperty(slug: string): Property | null {
  return DEMO_PROPERTIES.find((p) => p.slug === slug && p.status === "published") ?? null;
}

export function demoFeaturedProperties(limit: number): Property[] {
  return newest(DEMO_PROPERTIES.filter((p) => p.status === "published" && p.is_featured)).slice(0, limit);
}

export function demoListProducts(filters: ProductFilters = {}): Paginated<Product> {
  const perPage = filters.perPage ?? PER_PAGE;
  let items = DEMO_PRODUCTS.filter((p) => p.status === "published");

  if (filters.q) {
    const needle = filters.q.toLowerCase();
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        (p.description ?? "").toLowerCase().includes(needle),
    );
  }
  if (filters.category) {
    const match = DEMO_CATEGORIES.find((c) => c.slug === filters.category);
    items = match ? items.filter((p) => p.category_id === match.id) : [];
  }

  items =
    filters.sort === "price_asc"
      ? byPrice(items, "asc", "price")
      : filters.sort === "price_desc"
        ? byPrice(items, "desc", "price")
        : newest(items);

  return page(items, Math.max(1, filters.page ?? 1), perPage);
}

export function demoGetProduct(slug: string): Product | null {
  return DEMO_PRODUCTS.find((p) => p.slug === slug && p.status === "published") ?? null;
}

export function demoFeaturedProducts(limit: number): Product[] {
  return newest(DEMO_PRODUCTS.filter((p) => p.status === "published" && p.is_featured)).slice(0, limit);
}
