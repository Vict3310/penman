/**
 * Pure helpers behind the account area.
 *
 * Deliberately free of database, session and framework imports so they can be
 * unit tested directly, and so the completion arithmetic and the email-change
 * rule are stated once rather than re-derived inside a page and its action.
 */

export interface ProfileSnapshot {
  full_name: string | null;
  email: string;
  phone: string | null;
  password_hash: string | null;
  email_verified_at: string | null;
}

export interface ProfileCompletionItem {
  key: string;
  label: string;
  /** Where the customer goes to complete this item. */
  href: string;
  done: boolean;
}

export interface ProfileCompletion {
  percent: number;
  done: number;
  total: number;
  items: ProfileCompletionItem[];
}

/**
 * Profile completeness, counted from fields this deployment can actually
 * store and the customer can actually fill in.
 *
 * `email_verified_at` is deliberately NOT one of the items. Nothing in this
 * project sends email yet, so that column can only be set by the operator's
 * bootstrap script — counting it would show every real customer a profile
 * that can never reach 100%, which is a fabricated statistic dressed up as a
 * progress bar. It is surfaced instead as an explicit note on the profile
 * page, saying plainly that verification is not yet enforced.
 */
export function computeProfileCompletion(profile: ProfileSnapshot): ProfileCompletion {
  const items: ProfileCompletionItem[] = [
    {
      key: "name",
      label: "Add your full name",
      href: "/account/profile",
      done: Boolean(profile.full_name && profile.full_name.trim().length >= 2),
    },
    {
      key: "phone",
      label: "Add a phone number so we can reach you",
      href: "/account/profile",
      done: Boolean(profile.phone && profile.phone.trim().length >= 7),
    },
    {
      key: "password",
      label: "Set a password",
      href: "/account/security",
      done: Boolean(profile.password_hash),
    },
  ];

  const done = items.filter((item) => item.done).length;
  const total = items.length;

  return {
    percent: Math.round((done / total) * 100),
    done,
    total,
    items,
  };
}

/**
 * Does changing the sign-in address need the current password?
 *
 * Yes, and only then. The address IS the sign-in identifier, so moving it is
 * the one profile edit worth stealing a session for: an attacker with a
 * borrowed cookie could otherwise point the account at their own inbox and
 * complete a password reset. Re-proving the password closes that. Changing a
 * name or phone number needs nothing extra, because neither grants anything.
 *
 * Comparison is case-insensitive and trimmed, matching the database's
 * normalize_profile_email() trigger — otherwise "Owner@x.com" would look like
 * a change from "owner@x.com" and demand a password for a no-op.
 */
export function emailChangeNeedsPassword(currentEmail: string, nextEmail: string): boolean {
  return normalizeEmailAddress(currentEmail) !== normalizeEmailAddress(nextEmail);
}

/** The single normalization applied before an address is stored or compared. */
export function normalizeEmailAddress(email: string): string {
  return email.trim().toLowerCase();
}

/** A display name derived from an address, for an account with no name set. */
export function getNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim() ?? "";
  if (!local) return email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** "Chima Obugo" → "Chima"; falls back to the local part of the address. */
export function firstNameFrom(fullName: string | null | undefined, email: string): string {
  const trimmed = fullName?.trim();
  if (trimmed) return trimmed.split(/\s+/)[0] ?? trimmed;

  const local = email.split("@")[0]?.trim();
  if (!local) return "there";

  // "chima.obugo" and "chima_obugo" should read as "Chima".
  const first = local.split(/[._-]+/)[0] ?? local;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/** "Chima Obugo" → "CO"; a single name gives "C"; never returns empty. */
export function initialsFrom(fullName: string | null | undefined, email: string): string {
  const trimmed = fullName?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const letters = [parts[0], parts.length > 1 ? parts[parts.length - 1] : null]
      .filter((part): part is string => Boolean(part))
      .map((part) => part.charAt(0))
      .join("");
    if (letters) return letters.toUpperCase();
  }

  // `|| "?"` rather than `?? "?"`: an empty string is not null, and it would
  // otherwise render an empty avatar circle.
  const local = email.split("@")[0]?.trim();
  return (local?.charAt(0) || "?").toUpperCase();
}

/**
 * Human-friendly relative time for the activity feed.
 *
 * Takes `now` explicitly so the output is testable rather than dependent on
 * the clock at the moment of the call.
 */
export function relativeTime(value: string | Date, now: Date = new Date()): string {
  const then = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(then.getTime())) return "";

  const seconds = Math.round((now.getTime() - then.getTime()) / 1000);
  if (seconds < 45) return "just now";
  if (seconds < 90) return "a minute ago";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "an hour ago" : `${hours} hours ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;

  const months = Math.round(days / 30);
  if (months < 12) return months === 1 ? "last month" : `${months} months ago`;

  const years = Math.round(months / 12);
  return years === 1 ? "last year" : `${years} years ago`;
}
