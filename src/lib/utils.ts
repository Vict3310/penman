import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a numeric amount as currency (default: Nigerian Naira). */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency = "NGN",
  locale = "en-NG",
): string {
  if (amount === null || amount === undefined || amount === "") return "Price on request";
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(value)) return "Price on request";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Odometer reading: 184781 → "184,781 km".
 *
 * Returns null rather than a placeholder when there is no reading, so callers
 * can leave the row out entirely instead of printing an invented zero.
 */
export function formatMileage(km: number | null | undefined, locale = "en-NG"): string | null {
  if (km === null || km === undefined || !Number.isFinite(km)) return null;
  return `${new Intl.NumberFormat(locale).format(km)} km`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(input: string, length = 140): string {
  if (input.length <= length) return input;
  return `${input.slice(0, length).trimEnd()}…`;
}

/** Build a wa.me link with a prefilled message. */
export function whatsappLink(number: string | null | undefined, message: string): string | null {
  if (!number) return null;
  const cleaned = number.replace(/[^\d]/g, "");
  if (!cleaned) return null;
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}
