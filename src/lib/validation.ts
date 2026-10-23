import { z } from "zod";

// The limits live in ./auth/policy.ts, which is the one module under
// src/lib/auth/ that is NOT server-only precisely so shared validation and
// client forms can agree on the same numbers.
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/auth/policy";

/* ── primitives ──────────────────────────────────────────────────────── */

const trimmed = (max: number) => z.string().trim().max(max);

// Optional fields throughout this file accept a missing value, an empty string
// or an explicit `null` (both of which the database and the JSON form payloads
// can produce) and normalise all of them to `null`, so "nothing supplied" has
// exactly one representation in the application.

export const phoneSchema = z
  .string()
  .trim()
  .min(7, "Enter a valid phone number")
  .max(32, "Phone number is too long")
  .regex(/^[+()\-\s\d]+$/, "Phone number contains invalid characters");

export const optionalEmailSchema = z
  .union([z.literal(""), z.string().trim().email("Enter a valid email address")])
  .nullish()
  .transform((value) => (value ? value : null));

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");

export const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only");

const mediaRefSchema = z.object({
  path: z.string().trim().min(1),
  url: z.string().trim().url(),
  alt: z.string().trim().max(200).optional(),
});

const optionalNumber = z
  .union([z.literal(""), z.null(), z.coerce.number()])
  .optional()
  .transform((v) => (v === "" || v === null || v === undefined ? null : (v as number)));

const optionalInt = z
  .union([z.literal(""), z.null(), z.coerce.number().int()])
  .optional()
  .transform((v) => (v === "" || v === null || v === undefined ? null : (v as number)));

/* ── public enquiry forms ────────────────────────────────────────────── */

export const rentalEnquirySchema = z
  .object({
    vehicle_id: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
    name: trimmed(120).min(2, "Enter your name"),
    phone: phoneSchema,
    email: optionalEmailSchema,
    pickup_date: isoDate,
    return_date: isoDate,
    message: trimmed(2000).nullish().transform((v) => v || null),
  })
  .refine((d) => new Date(d.return_date) >= new Date(d.pickup_date), {
    message: "Return date must be on or after the pickup date",
    path: ["return_date"],
  });

export type RentalEnquiryInput = z.input<typeof rentalEnquirySchema>;

export const propertyEnquirySchema = z.object({
  property_id: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
  name: trimmed(120).min(2, "Enter your name"),
  phone: phoneSchema,
  email: optionalEmailSchema,
  message: trimmed(2000).nullish().transform((v) => v || null),
});

export type PropertyEnquiryInput = z.input<typeof propertyEnquirySchema>;

export const shopEnquirySchema = z.object({
  product_id: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
  name: trimmed(120).min(2, "Enter your name"),
  phone: phoneSchema,
  email: optionalEmailSchema,
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").max(999),
  message: trimmed(2000).nullish().transform((v) => v || null),
  channel: z.enum(["form", "whatsapp"]).default("form"),
});

export type ShopEnquiryInput = z.input<typeof shopEnquirySchema>;

export const contactMessageSchema = z.object({
  name: trimmed(120).min(2, "Enter your name"),
  phone: phoneSchema,
  email: optionalEmailSchema,
  subject: trimmed(160).min(2, "Enter a subject"),
  message: trimmed(4000).min(10, "Tell us a little more"),
});

export type ContactMessageInput = z.input<typeof contactMessageSchema>;

/* ── account area ────────────────────────────────────────────────────── */

/**
 * The customer's own profile.
 *
 * What this schema deliberately CANNOT accept is the point: there is no
 * `role`, no `status`, no `password_hash` and no `id`. Every field a customer
 * may edit is listed; anything else is dropped by Zod before it can reach a
 * query, so privilege escalation through the profile form is not a matter of
 * remembering to omit a field.
 */
export const profileUpdateSchema = z.object({
  fullName: trimmed(120).min(2, "Enter your full name"),
  email: z.string().trim().max(254).email("Enter a valid email address"),
  phone: z
    .union([z.literal(""), phoneSchema])
    .optional()
    .transform((v) => v || null),
  /**
   * Only consulted when the email address actually changes — see
   * `emailChangeNeedsPassword()` in src/lib/account/profile.ts. A stolen
   * session cookie must not be enough to move an account to a new sign-in
   * address, so changing it requires the current password.
   */
  currentPassword: z
    .string()
    .max(MAX_PASSWORD_LENGTH)
    .optional()
    .transform((v) => v ?? ""),
});

export type ProfileUpdateInput = z.input<typeof profileUpdateSchema>;

/**
 * A password change.
 *
 * `currentPassword` is required unconditionally: unlike a reset (where the
 * reset token is the proof), this is a signed-in user replacing their own
 * credential, and re-proving knowledge of the existing one is what stops a
 * borrowed session from locking the owner out.
 */
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
      .max(MAX_PASSWORD_LENGTH, "That password is too long"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "That is your current password. Choose a different one.",
    path: ["newPassword"],
  });

export type PasswordChangeInput = z.input<typeof passwordChangeSchema>;

/* ── password reset ──────────────────────────────────────────────────── */

/**
 * The address a reset link is requested for.
 *
 * Only shape is validated here. Whether an account exists is deliberately not
 * something this schema (or the action) can reveal.
 */
export const passwordResetRequestSchema = z.object({
  email: z.string().trim().max(254).email("Enter a valid email address"),
});

/**
 * A reset link submission.
 *
 * `token` is opaque to the client and is re-hashed on the server; the length
 * bound is only there to keep absurd input out of the query path. There is no
 * `currentPassword`: the single-use token is the proof of identity, which is
 * what makes this the one route an account with no credential can recover by.
 */
export const passwordResetSchema = z
  .object({
    token: z.string().trim().min(20, "That reset link is not valid.").max(200),
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
      .max(MAX_PASSWORD_LENGTH, "That password is too long"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type PasswordResetInput = z.input<typeof passwordResetSchema>;

/* ── admin: vehicles ─────────────────────────────────────────────────── */

export const vehicleSchema = z.object({
  slug: slugSchema,
  name: trimmed(160).min(2, "Vehicle name is required"),
  category: trimmed(80).min(1, "Category is required"),
  description: trimmed(4000).nullish().transform((v) => v || null),
  rate: optionalNumber,
  rate_period: z.enum(["hour", "day", "week", "month"]).default("day"),
  currency: trimmed(3).min(3).max(3).default("NGN"),
  seats: optionalInt,
  doors: optionalInt,
  transmission: z
    .enum(["automatic", "manual", "cvt", "other"])
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  fuel_type: z
    .enum(["petrol", "diesel", "hybrid", "electric", "other"])
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  year: optionalInt,
  availability: z
    .enum(["available", "unavailable", "maintenance", "reserved"])
    .default("available"),
  rental_terms: trimmed(4000).nullish().transform((v) => v || null),
  images: z.array(mediaRefSchema).default([]),
  is_featured: z.coerce.boolean().default(false),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  seo_title: trimmed(160).nullish().transform((v) => v || null),
  seo_description: trimmed(320).nullish().transform((v) => v || null),
});

export type VehicleInput = z.input<typeof vehicleSchema>;

/* ── admin: properties ───────────────────────────────────────────────── */

export const propertySchema = z.object({
  slug: slugSchema,
  title: trimmed(160).min(2, "Title is required"),
  description: trimmed(8000).nullish().transform((v) => v || null),
  listing_type: z.enum(["sale", "rent"]).default("sale"),
  property_type: z
    .enum(["house", "apartment", "duplex", "bungalow", "land", "commercial", "other"])
    .default("house"),
  location: trimmed(160).min(1, "Location is required"),
  address: trimmed(300).nullish().transform((v) => v || null),
  price: optionalNumber,
  price_type: z.enum(["fixed", "negotiable", "on_request"]).default("fixed"),
  currency: trimmed(3).min(3).max(3).default("NGN"),
  bedrooms: optionalInt,
  bathrooms: optionalInt,
  area_sqm: optionalNumber,
  amenities: z.array(trimmed(120)).default([]),
  availability: z.enum(["available", "reserved", "sold", "let"]).default("available"),
  contact_name: trimmed(120).nullish().transform((v) => v || null),
  contact_phone: z
    .union([z.literal(""), phoneSchema])
    .optional()
    .transform((v) => v || null),
  contact_email: optionalEmailSchema,
  images: z.array(mediaRefSchema).default([]),
  is_featured: z.coerce.boolean().default(false),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  seo_title: trimmed(160).nullish().transform((v) => v || null),
  seo_description: trimmed(320).nullish().transform((v) => v || null),
});

export type PropertyInput = z.input<typeof propertySchema>;

/* ── admin: products & categories ────────────────────────────────────── */

export const productSchema = z.object({
  slug: slugSchema,
  name: trimmed(160).min(2, "Product name is required"),
  sku: trimmed(80).nullish().transform((v) => v || null),
  description: trimmed(4000).nullish().transform((v) => v || null),
  price: optionalNumber,
  currency: trimmed(3).min(3).max(3).default("NGN"),
  category_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  track_stock: z.coerce.boolean().default(false),
  stock_quantity: z.coerce.number().int().min(0).default(0),
  availability: z.enum(["available", "unavailable", "reserved"]).default("available"),
  images: z.array(mediaRefSchema).default([]),
  is_featured: z.coerce.boolean().default(false),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  seo_title: trimmed(160).nullish().transform((v) => v || null),
  seo_description: trimmed(320).nullish().transform((v) => v || null),
});

export type ProductInput = z.input<typeof productSchema>;

export const categorySchema = z.object({
  slug: slugSchema,
  name: trimmed(120).min(1, "Category name is required"),
  description: trimmed(500).nullish().transform((v) => v || null),
  position: z.coerce.number().int().min(0).default(0),
});

export type CategoryInput = z.input<typeof categorySchema>;

/* ── admin: enquiry mutations & settings ─────────────────────────────── */

export const enquiryUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.string().trim().min(1),
  internal_notes: trimmed(4000).nullish().transform((v) => v || null),
});

export const settingsSectionSchema = z.object({
  key: z.enum(["brand", "contact", "social", "hero", "about", "footer", "seo"]),
  value: z.record(z.string(), z.unknown()),
});

/* ── helpers ─────────────────────────────────────────────────────────── */

export type FieldErrors = Record<string, string[]>;

/** Flatten a ZodError into a simple field -> messages map for the UI. */
export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_form";
    out[key] = [...(out[key] ?? []), issue.message];
  }
  return out;
}
