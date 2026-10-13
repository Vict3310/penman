import type { FormSection, FormValues } from "@/components/admin/resource-form";
import type { Product, Property, Vehicle } from "@/lib/types";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft — not visible on the site" },
  { value: "published", label: "Published — visible on the site" },
  { value: "archived", label: "Archived — kept, but hidden" },
];

const CURRENCY_OPTIONS = [
  { value: "NGN", label: "NGN — Nigerian Naira" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "GBP", label: "GBP — Pound Sterling" },
  { value: "EUR", label: "EUR — Euro" },
];

/* ── Vehicles ────────────────────────────────────────────────────────── */

export function vehicleSections(): FormSection[] {
  return [
    {
      title: "Basic details",
      description: "How this vehicle is titled and described on the public site.",
      fields: [
        { kind: "text", name: "name", label: "Vehicle name", placeholder: "e.g. Toyota Corolla 2022", slugFrom: true },
        { kind: "text", name: "slug", label: "URL slug", half: true, help: "Lowercase words separated by hyphens." },
        { kind: "text", name: "category", label: "Category", half: true, placeholder: "Sedan, SUV, Bus…" },
        {
          kind: "textarea",
          name: "description",
          label: "Description",
          rows: 6,
          placeholder: "Describe the vehicle, its condition and what it suits.",
        },
      ],
    },
    {
      title: "Rental rate",
      fields: [
        { kind: "money", name: "rate", label: "Rate", half: true, help: "Leave blank to show “Rate on request”." },
        {
          kind: "select",
          name: "rate_period",
          label: "Rate period",
          half: true,
          options: [
            { value: "hour", label: "Per hour" },
            { value: "day", label: "Per day" },
            { value: "week", label: "Per week" },
            { value: "month", label: "Per month" },
          ],
        },
        { kind: "select", name: "currency", label: "Currency", half: true, options: CURRENCY_OPTIONS },
        {
          kind: "textarea",
          name: "rental_terms",
          label: "Rental terms",
          rows: 5,
          placeholder: "Deposits, fuel policy, mileage limits, driver requirements…",
        },
      ],
    },
    {
      title: "Specification",
      fields: [
        { kind: "number", name: "seats", label: "Passenger capacity", half: true, placeholder: "5" },
        { kind: "number", name: "doors", label: "Doors", half: true, placeholder: "4" },
        {
          kind: "select",
          name: "transmission",
          label: "Transmission",
          half: true,
          allowEmpty: true,
          options: [
            { value: "automatic", label: "Automatic" },
            { value: "manual", label: "Manual" },
            { value: "cvt", label: "CVT" },
            { value: "other", label: "Other" },
          ],
        },
        {
          kind: "select",
          name: "fuel_type",
          label: "Fuel type",
          half: true,
          allowEmpty: true,
          options: [
            { value: "petrol", label: "Petrol" },
            { value: "diesel", label: "Diesel" },
            { value: "hybrid", label: "Hybrid" },
            { value: "electric", label: "Electric" },
            { value: "other", label: "Other" },
          ],
        },
        { kind: "number", name: "year", label: "Year", half: true, placeholder: "2022" },
        {
          kind: "select",
          name: "availability",
          label: "Availability",
          half: true,
          options: [
            { value: "available", label: "Available" },
            { value: "unavailable", label: "Unavailable" },
            { value: "maintenance", label: "In maintenance" },
            { value: "reserved", label: "Reserved" },
          ],
        },
      ],
    },
    {
      title: "Photographs",
      description: "The first image is used as the cover. Drag-free reordering with the arrow buttons.",
      fields: [{ kind: "media", name: "images", label: "Vehicle images", section: "vehicles", slugField: "slug" }],
    },
    {
      title: "Publishing & SEO",
      fields: [
        { kind: "select", name: "status", label: "Status", half: true, options: STATUS_OPTIONS },
        { kind: "switch", name: "is_featured", label: "Feature on the homepage", help: "Featured vehicles are shown in the homepage carousel." },
        { kind: "text", name: "seo_title", label: "SEO title", half: true, help: "Leave blank to use the vehicle name." },
        { kind: "textarea", name: "seo_description", label: "SEO description", rows: 3 },
      ],
    },
  ];
}

export function vehicleValues(vehicle?: Vehicle | null): FormValues {
  return {
    name: vehicle?.name ?? "",
    slug: vehicle?.slug ?? "",
    category: vehicle?.category ?? "",
    description: vehicle?.description ?? "",
    rate: vehicle?.rate ?? "",
    rate_period: vehicle?.rate_period ?? "day",
    currency: vehicle?.currency ?? "NGN",
    rental_terms: vehicle?.rental_terms ?? "",
    seats: vehicle?.seats ?? "",
    doors: vehicle?.doors ?? "",
    transmission: vehicle?.transmission ?? "",
    fuel_type: vehicle?.fuel_type ?? "",
    year: vehicle?.year ?? "",
    availability: vehicle?.availability ?? "available",
    images: vehicle?.images ?? [],
    is_featured: vehicle?.is_featured ?? false,
    status: vehicle?.status ?? "draft",
    seo_title: vehicle?.seo_title ?? "",
    seo_description: vehicle?.seo_description ?? "",
  };
}

/* ── Properties ──────────────────────────────────────────────────────── */

export function propertySections(): FormSection[] {
  return [
    {
      title: "Listing details",
      fields: [
        { kind: "text", name: "title", label: "Property title", slugFrom: true },
        { kind: "text", name: "slug", label: "URL slug", half: true },
        { kind: "text", name: "location", label: "Location", half: true, placeholder: "Area, city" },
        { kind: "text", name: "address", label: "Full address", half: true, help: "Optional — shown on the detail page." },
        {
          kind: "select",
          name: "listing_type",
          label: "Sale or rent",
          half: true,
          options: [
            { value: "sale", label: "For sale" },
            { value: "rent", label: "To let" },
          ],
        },
        {
          kind: "select",
          name: "property_type",
          label: "Property type",
          half: true,
          options: [
            { value: "house", label: "House" },
            { value: "apartment", label: "Apartment" },
            { value: "duplex", label: "Duplex" },
            { value: "bungalow", label: "Bungalow" },
            { value: "land", label: "Land" },
            { value: "commercial", label: "Commercial" },
            { value: "other", label: "Other" },
          ],
        },
        { kind: "textarea", name: "description", label: "Description", rows: 7 },
      ],
    },
    {
      title: "Pricing",
      fields: [
        { kind: "money", name: "price", label: "Price", half: true },
        {
          kind: "select",
          name: "price_type",
          label: "Price type",
          half: true,
          options: [
            { value: "fixed", label: "Fixed price" },
            { value: "negotiable", label: "Negotiable" },
            { value: "on_request", label: "Price on request" },
          ],
        },
        { kind: "select", name: "currency", label: "Currency", half: true, options: CURRENCY_OPTIONS },
        {
          kind: "select",
          name: "availability",
          label: "Availability",
          half: true,
          options: [
            { value: "available", label: "Available" },
            { value: "reserved", label: "Reserved" },
            { value: "sold", label: "Sold" },
            { value: "let", label: "Let" },
          ],
        },
      ],
    },
    {
      title: "Property attributes",
      fields: [
        { kind: "number", name: "bedrooms", label: "Bedrooms", half: true },
        { kind: "number", name: "bathrooms", label: "Bathrooms", half: true },
        { kind: "number", name: "area_sqm", label: "Area (m²)", half: true, step: "0.01" },
        {
          kind: "tags",
          name: "amenities",
          label: "Features & amenities",
          placeholder: "e.g. Fitted kitchen",
          help: "Press Enter after each item.",
        },
      ],
    },
    {
      title: "Photographs",
      fields: [{ kind: "media", name: "images", label: "Property images", section: "properties", slugField: "slug" }],
    },
    {
      title: "Enquiry contact",
      description: "Optional per-listing contact details shown on the property page.",
      fields: [
        { kind: "text", name: "contact_name", label: "Contact name", half: true },
        { kind: "text", name: "contact_phone", label: "Contact phone", half: true },
        { kind: "text", name: "contact_email", label: "Contact email", half: true },
      ],
    },
    {
      title: "Publishing & SEO",
      fields: [
        { kind: "select", name: "status", label: "Status", half: true, options: STATUS_OPTIONS },
        { kind: "switch", name: "is_featured", label: "Feature on the homepage" },
        { kind: "text", name: "seo_title", label: "SEO title", half: true },
        { kind: "textarea", name: "seo_description", label: "SEO description", rows: 3 },
      ],
    },
  ];
}

export function propertyValues(property?: Property | null): FormValues {
  return {
    title: property?.title ?? "",
    slug: property?.slug ?? "",
    location: property?.location ?? "",
    address: property?.address ?? "",
    listing_type: property?.listing_type ?? "sale",
    property_type: property?.property_type ?? "house",
    description: property?.description ?? "",
    price: property?.price ?? "",
    price_type: property?.price_type ?? "fixed",
    currency: property?.currency ?? "NGN",
    availability: property?.availability ?? "available",
    bedrooms: property?.bedrooms ?? "",
    bathrooms: property?.bathrooms ?? "",
    area_sqm: property?.area_sqm ?? "",
    amenities: property?.amenities ?? [],
    images: property?.images ?? [],
    contact_name: property?.contact_name ?? "",
    contact_phone: property?.contact_phone ?? "",
    contact_email: property?.contact_email ?? "",
    status: property?.status ?? "draft",
    is_featured: property?.is_featured ?? false,
    seo_title: property?.seo_title ?? "",
    seo_description: property?.seo_description ?? "",
  };
}

/* ── Products ────────────────────────────────────────────────────────── */

export function productSections(
  categories: { id: string; name: string }[],
): FormSection[] {
  return [
    {
      title: "Vehicle details",
      fields: [
        { kind: "text", name: "name", label: "Vehicle name", slugFrom: true },
        { kind: "text", name: "slug", label: "URL slug", half: true },
        { kind: "text", name: "sku", label: "VIN / stock code", half: true, help: "Optional internal reference." },
        {
          kind: "select",
          name: "category_id",
          label: "Vehicle category",
          half: true,
          allowEmpty: true,
          options: categories.map((c) => ({ value: c.id, label: c.name })),
        },
        { kind: "textarea", name: "description", label: "Vehicle description", rows: 6 },
      ],
    },
    {
      title: "Pricing & listing status",
      fields: [
        { kind: "money", name: "price", label: "Selling price", half: true },
        { kind: "select", name: "currency", label: "Currency", half: true, options: CURRENCY_OPTIONS },
        {
          kind: "switch",
          name: "track_stock",
          label: "Track stock for this vehicle listing",
          help: "When enabled, the public page shows a stock status based on the quantity below.",
        },
        { kind: "number", name: "stock_quantity", label: "Available stock", half: true },
        {
          kind: "select",
          name: "availability",
          label: "Availability",
          half: true,
          options: [
            { value: "available", label: "Available" },
            { value: "unavailable", label: "Unavailable" },
            { value: "reserved", label: "Reserved" },
          ],
        },
      ],
    },
    {
      title: "Photographs",
      fields: [{ kind: "media", name: "images", label: "Vehicle images", section: "products", slugField: "slug" }],
    },
    {
      title: "Publishing & SEO",
      fields: [
        { kind: "select", name: "status", label: "Status", half: true, options: STATUS_OPTIONS },
        { kind: "switch", name: "is_featured", label: "Feature on the homepage" },
        { kind: "text", name: "seo_title", label: "SEO title", half: true },
        { kind: "textarea", name: "seo_description", label: "SEO description", rows: 3 },
      ],
    },
  ];
}

export function productValues(product?: Product | null): FormValues {
  return {
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    sku: product?.sku ?? "",
    category_id: product?.category_id ?? "",
    description: product?.description ?? "",
    price: product?.price ?? "",
    currency: product?.currency ?? "NGN",
    track_stock: product?.track_stock ?? false,
    stock_quantity: product?.stock_quantity ?? 0,
    availability: product?.availability ?? "available",
    images: product?.images ?? [],
    status: product?.status ?? "draft",
    is_featured: product?.is_featured ?? false,
    seo_title: product?.seo_title ?? "",
    seo_description: product?.seo_description ?? "",
  };
}
