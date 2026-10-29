"use server";

import { getSessionUser } from "@/lib/auth/current-user";
import { getAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole } from "@/lib/env";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { fail, succeed, type ActionResult } from "@/lib/action-result";
import {
  contactMessageSchema,
  propertyEnquirySchema,
  rentalEnquirySchema,
  shopEnquirySchema,
  zodFieldErrors,
} from "@/lib/validation";

/**
 * Public enquiry submissions.
 *
 * These run on the server and write with the service-role client, so the
 * browser never holds a key that can insert rows. Every submission is
 * validated on the server and rate limited before it reaches the database.
 */

const RATE_LIMIT_MESSAGE =
  "You have sent several enquiries already. Please wait a few minutes before trying again, or contact us on WhatsApp.";

function toObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

const NOT_CONFIGURED =
  "We could not save your enquiry because the website is not connected to its database yet. Please contact us directly in the meantime.";

/*
 * Enquiries are open to anonymous visitors on purpose.
 *
 * An earlier revision required a signed-in account before an enquiry could be
 * sent, which meant an unconfigured identity provider silently blocked every
 * contact form on the site. That is the opposite of what a business with a
 * contact page needs, so the gate is gone: browse and enquire freely, create
 * an account only if you want one.
 *
 * The protections that actually matter stay in place. Each action below
 * applies a per-client rate limit before touching the database, every payload
 * is validated with zod, and the inserts run through the service-role client,
 * which is never reachable from the browser.
 *
 * When a signed-in customer submits one, the row is stamped with THEIR id so
 * it can appear in their account area. That id comes from the session and is
 * never read from the form — a hidden field carrying a user id would let
 * anyone attribute an enquiry to anyone. A guest enquiry simply has no owner,
 * which is a legitimate state: see migration 0004.
 */

/**
 * The id of the signed-in customer, or null for a guest.
 *
 * Wrapped because these actions must never fail on attribution: if the session
 * cannot be resolved the enquiry is still a valid enquiry, and refusing to
 * accept it would be a worse outcome than filing it unowned.
 */
async function currentCustomerId(): Promise<string | null> {
  try {
    return (await getSessionUser())?.id ?? null;
  } catch {
    return null;
  }
}

/* ── Rental enquiry ──────────────────────────────────────────────────── */

export async function submitRentalEnquiry(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const limit = rateLimit(await clientKey("rental"));
  if (!limit.ok) return fail(RATE_LIMIT_MESSAGE);

  const parsed = rentalEnquirySchema.safeParse(toObject(formData));
  if (!parsed.success) {
    return fail("Please check the highlighted fields and try again.", zodFieldErrors(parsed.error));
  }
  if (!hasServiceRole()) return fail(NOT_CONFIGURED);

  const input = parsed.data;

  try {
    const supabase = getAdminClient();

    // Snapshot the vehicle name so the enquiry stays readable even if the
    // vehicle is later archived or deleted.
    let vehicleName: string | null = null;
    if (input.vehicle_id) {
      const { data } = await supabase
        .from("vehicles")
        .select("name")
        .eq("id", input.vehicle_id)
        .maybeSingle<{ name: string }>();
      vehicleName = data?.name ?? null;
    }

    const { error } = await supabase.from("rental_enquiries").insert({
      user_id: await currentCustomerId(),
      vehicle_id: input.vehicle_id,
      vehicle_name: vehicleName,
      name: input.name,
      phone: input.phone,
      email: input.email,
      pickup_date: input.pickup_date,
      return_date: input.return_date,
      message: input.message,
    });

    if (error) return fail("We could not save your enquiry. Please try again or contact us directly.");

    return succeed(
      "Thank you — your rental enquiry has been received. Our team will review it and contact you to confirm availability.",
    );
  } catch {
    return fail("Something went wrong while sending your enquiry. Please try again.");
  }
}

/* ── Property enquiry ────────────────────────────────────────────────── */

export async function submitPropertyEnquiry(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const limit = rateLimit(await clientKey("property"));
  if (!limit.ok) return fail(RATE_LIMIT_MESSAGE);

  const parsed = propertyEnquirySchema.safeParse(toObject(formData));
  if (!parsed.success) {
    return fail("Please check the highlighted fields and try again.", zodFieldErrors(parsed.error));
  }
  if (!hasServiceRole()) return fail(NOT_CONFIGURED);

  const input = parsed.data;

  try {
    const supabase = getAdminClient();

    let propertyTitle: string | null = null;
    if (input.property_id) {
      const { data } = await supabase
        .from("properties")
        .select("title")
        .eq("id", input.property_id)
        .maybeSingle<{ title: string }>();
      propertyTitle = data?.title ?? null;
    }

    const { error } = await supabase.from("property_enquiries").insert({
      user_id: await currentCustomerId(),
      property_id: input.property_id,
      property_title: propertyTitle,
      name: input.name,
      phone: input.phone,
      email: input.email,
      message: input.message,
    });

    if (error) return fail("We could not save your enquiry. Please try again or contact us directly.");

    return succeed(
      "Thank you — your property enquiry has been received. Our team will get back to you shortly.",
    );
  } catch {
    return fail("Something went wrong while sending your enquiry. Please try again.");
  }
}

/* ── Shop enquiry / order ────────────────────────────────────────────── */

export async function submitShopEnquiry(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const limit = rateLimit(await clientKey("shop"));
  if (!limit.ok) return fail(RATE_LIMIT_MESSAGE);

  const parsed = shopEnquirySchema.safeParse(toObject(formData));
  if (!parsed.success) {
    return fail("Please check the highlighted fields and try again.", zodFieldErrors(parsed.error));
  }
  if (!hasServiceRole()) return fail(NOT_CONFIGURED);

  const input = parsed.data;

  try {
    const supabase = getAdminClient();

    let productName: string | null = null;
    if (input.product_id) {
      const { data } = await supabase
        .from("products")
        .select("name")
        .eq("id", input.product_id)
        .maybeSingle<{ name: string }>();
      productName = data?.name ?? null;
    }

    const { error } = await supabase.from("shop_enquiries").insert({
      user_id: await currentCustomerId(),
      product_id: input.product_id,
      product_name: productName,
      name: input.name,
      phone: input.phone,
      email: input.email,
      quantity: input.quantity,
      message: input.intent === "question" ? input.message : `${input.intent === "viewing" ? "Viewing request" : "Sourcing request"}${input.message ? `: ${input.message}` : "."}`,
      channel: input.channel,
    });

    if (error) return fail("We could not save your order enquiry. Please try again or contact us directly.");

    return succeed("Thank you — your order enquiry has been received. We will confirm the details with you shortly.");
  } catch {
    return fail("Something went wrong while sending your enquiry. Please try again.");
  }
}

/* ── General contact message ─────────────────────────────────────────── */

export async function submitContactMessage(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const limit = rateLimit(await clientKey("contact"));
  if (!limit.ok) return fail(RATE_LIMIT_MESSAGE);

  const parsed = contactMessageSchema.safeParse(toObject(formData));
  if (!parsed.success) {
    return fail("Please check the highlighted fields and try again.", zodFieldErrors(parsed.error));
  }
  if (!hasServiceRole()) return fail(NOT_CONFIGURED);

  const input = parsed.data;

  try {
    const { error } = await getAdminClient().from("contact_messages").insert({
      name: input.name,
      phone: input.phone,
      email: input.email,
      subject: input.subject,
      message: input.message,
    });

    if (error) return fail("We could not send your message. Please try again or contact us directly.");

    return succeed("Thank you for reaching out. We have received your message and will respond soon.");
  } catch {
    return fail("Something went wrong while sending your message. Please try again.");
  }
}
