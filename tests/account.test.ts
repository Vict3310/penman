import { describe, expect, it } from "vitest";

import {
  computeProfileCompletion,
  emailChangeNeedsPassword,
  firstNameFrom,
  getNameFromEmail,
  initialsFrom,
  normalizeEmailAddress,
  relativeTime,
} from "@/lib/account/profile";
import { enquiryReference } from "@/lib/account/queries";
import { safeInternalPath } from "@/lib/safe-path";
import { passwordChangeSchema, profileUpdateSchema, zodFieldErrors } from "@/lib/validation";

/* ── Profile completion ──────────────────────────────────────────────── */

const fullProfile = {
  full_name: "Chima Obugo",
  email: "chima@penmanempire.com",
  phone: "+234 801 234 5678",
  password_hash: "$argon2id$v=19$m=19456,t=2,p=1$hash",
  email_verified_at: "2026-01-01T00:00:00.000Z",
};

describe("computeProfileCompletion", () => {
  it("reports 100% for an account with a name, a phone number and a password", () => {
    const completion = computeProfileCompletion(fullProfile);
    expect(completion.percent).toBe(100);
    expect(completion.done).toBe(completion.total);
    expect(completion.items.every((item) => item.done)).toBe(true);
  });

  it("counts only what is missing and points at where to fix it", () => {
    const completion = computeProfileCompletion({ ...fullProfile, phone: null });
    expect(completion.done).toBe(2);
    expect(completion.total).toBe(3);
    expect(completion.percent).toBe(67);

    const missing = completion.items.filter((item) => !item.done);
    expect(missing).toHaveLength(1);
    expect(missing[0]!.key).toBe("phone");
    expect(missing[0]!.href).toBe("/account/profile");
  });

  it("does not count an unverified email, because nothing can set it yet", () => {
    // A progress bar that can never reach 100% is worse than no progress bar.
    const completion = computeProfileCompletion({ ...fullProfile, email_verified_at: null });
    expect(completion.percent).toBe(100);
    expect(completion.items.map((item) => item.key)).not.toContain("email_verified_at");
  });

  it("treats whitespace as an empty field rather than a filled one", () => {
    const completion = computeProfileCompletion({ ...fullProfile, full_name: "   ", phone: "  " });
    expect(completion.done).toBe(1);
    expect(completion.items.find((item) => item.key === "name")?.done).toBe(false);
    expect(completion.items.find((item) => item.key === "phone")?.done).toBe(false);
  });

  it("reports 0% for a brand-new account awaiting a password", () => {
    const completion = computeProfileCompletion({
      full_name: null,
      email: "new@penmanempire.com",
      phone: null,
      password_hash: null,
      email_verified_at: null,
    });
    expect(completion.percent).toBe(0);
  });
});

/* ── The email-change rule ───────────────────────────────────────────── */

describe("emailChangeNeedsPassword", () => {
  it("requires the password when the address actually moves", () => {
    expect(emailChangeNeedsPassword("a@penmanempire.com", "b@penmanempire.com")).toBe(true);
  });

  it("does not require it for a no-op save in different case or with padding", () => {
    // The database lowercases and trims, so these are the same address. Asking
    // for a password here would be a demand the user could not satisfy.
    expect(emailChangeNeedsPassword("Owner@PenmanEmpire.com", "owner@penmanempire.com")).toBe(false);
    expect(emailChangeNeedsPassword("owner@penmanempire.com", "  owner@penmanempire.com  ")).toBe(false);
  });

  it("normalises with trim and lowercase only", () => {
    expect(normalizeEmailAddress("  MiXeD@Example.COM ")).toBe("mixed@example.com");
  });
});

/* ── Display helpers ─────────────────────────────────────────────────── */

describe("account display helpers", () => {
  it("takes the first name, and falls back to the address", () => {
    expect(firstNameFrom("Chima Obugo", "c@x.com")).toBe("Chima");
    expect(firstNameFrom(null, "chima.obugo@x.com")).toBe("Chima");
    expect(firstNameFrom("   ", "grace_t@x.com")).toBe("Grace");
    // No usable local part at all: a greeting needs SOMETHING, and an empty
    // string would render "Welcome back, ".
    expect(firstNameFrom(null, "@x.com")).toBe("there");
    expect(firstNameFrom(undefined, "")).toBe("there");
    // Separators are dropped: "grace_t-obi" is one first name, not four.
    expect(firstNameFrom(null, "grace_t-obi@x.com")).toBe("Grace");
  });

  it("builds initials from first and last name, or from the address", () => {
    expect(initialsFrom("Chima Obugo", "c@x.com")).toBe("CO");
    expect(initialsFrom("Chima", "c@x.com")).toBe("C");
    expect(initialsFrom(null, "chima@x.com")).toBe("C");
    expect(initialsFrom(null, "")).toBe("?");
  });

  it("derives a display name from an address with no name set", () => {
    expect(getNameFromEmail("chima.obugo@penmanempire.com")).toBe("Chima Obugo");
    expect(getNameFromEmail("grace_t-obi@x.com")).toBe("Grace T Obi");
    expect(getNameFromEmail("solo@x.com")).toBe("Solo");
  });

  it("describes relative time without depending on the wall clock", () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    expect(relativeTime("2026-06-15T11:59:30.000Z", now)).toBe("just now");
    expect(relativeTime("2026-06-15T11:30:00.000Z", now)).toBe("30 minutes ago");
    expect(relativeTime("2026-06-15T09:00:00.000Z", now)).toBe("3 hours ago");
    expect(relativeTime("2026-06-14T12:00:00.000Z", now)).toBe("yesterday");
    expect(relativeTime("2026-06-01T12:00:00.000Z", now)).toBe("14 days ago");
    expect(relativeTime("garbage", now)).toBe("");
  });

  it("gives each enquiry a short reference derived from its own id", () => {
    expect(enquiryReference("5f0c1b7e-1111-4222-8333-444455556666")).toBe("PE-5F0C1B");
    // Same id, same reference — it is the row's identity, not a random label.
    expect(enquiryReference("5f0c1b7e-1111-4222-8333-444455556666")).toBe(
      enquiryReference("5f0c1b7e-1111-4222-8333-444455556666"),
    );
  });
});

/* ── Profile schema: what it cannot express ──────────────────────────── */

describe("profileUpdateSchema", () => {
  it("accepts an ordinary update", () => {
    const result = profileUpdateSchema.safeParse({
      fullName: "Chima Obugo",
      email: "chima@penmanempire.com",
      phone: "+234 801 234 5678",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.currentPassword).toBe("");
  });

  it("strips role, status and id instead of letting them through", () => {
    const result = profileUpdateSchema.safeParse({
      fullName: "Chima Obugo",
      email: "chima@penmanempire.com",
      phone: "",
      role: "admin",
      status: "active",
      id: "99999999-0000-4000-8000-000000000000",
      password_hash: "$argon2id$attacker",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    // The whole point: a crafted payload cannot smuggle a permission change.
    expect(Object.keys(result.data)).not.toContain("role");
    expect(Object.keys(result.data)).not.toContain("status");
    expect(Object.keys(result.data)).not.toContain("id");
    expect(Object.keys(result.data)).not.toContain("password_hash");
  });

  it("normalises an empty phone number to null rather than an empty string", () => {
    const result = profileUpdateSchema.safeParse({
      fullName: "Chima Obugo",
      email: "chima@penmanempire.com",
      phone: "",
    });
    expect(result.success && result.data.phone).toBe(null);
  });

  it("rejects a malformed address and a one-letter name", () => {
    const result = profileUpdateSchema.safeParse({
      fullName: "C",
      email: "not-an-email",
      phone: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = zodFieldErrors(result.error);
      expect(errors.email?.[0]).toMatch(/valid email/i);
      expect(errors.fullName?.[0]).toBeTruthy();
    }
  });
});

/* ── Password schema ─────────────────────────────────────────────────── */

describe("passwordChangeSchema", () => {
  const base = { currentPassword: "old-password-1", newPassword: "new-password-1", confirmPassword: "new-password-1" };

  it("accepts a valid change", () => {
    expect(passwordChangeSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a confirmation that does not match", () => {
    const result = passwordChangeSchema.safeParse({ ...base, confirmPassword: "new-password-2" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodFieldErrors(result.error).confirmPassword?.[0]).toMatch(/do not match/i);
    }
  });

  it("rejects reusing the current password", () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: "same-password-1",
      newPassword: "same-password-1",
      confirmPassword: "same-password-1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodFieldErrors(result.error).newPassword?.[0]).toMatch(/current password/i);
    }
  });

  it("requires a current password and a long enough new one", () => {
    const missingCurrent = passwordChangeSchema.safeParse({ ...base, currentPassword: "" });
    expect(missingCurrent.success).toBe(false);

    const tooShort = passwordChangeSchema.safeParse({
      currentPassword: "old-password-1",
      newPassword: "short",
      confirmPassword: "short",
    });
    expect(tooShort.success).toBe(false);
    if (!tooShort.success) {
      expect(zodFieldErrors(tooShort.error).newPassword?.[0]).toMatch(/at least 8/i);
    }
  });
});

/* ── Redirect safety ─────────────────────────────────────────────────── */

describe("safeInternalPath", () => {
  it("accepts ordinary same-site paths", () => {
    expect(safeInternalPath("/account/saved")).toBe("/account/saved");
    expect(safeInternalPath("/account/enquiries?page=2")).toBe("/account/enquiries?page=2");
    expect(safeInternalPath("/")).toBe("/");
  });

  it("rejects protocol-relative and backslash redirects", () => {
    // These are the shapes that look internal to a prefix check and are not:
    // a browser reads "//host" as an absolute URL on the current scheme.
    expect(safeInternalPath("//evil.example/penman")).toBe(null);
    expect(safeInternalPath("/\\evil.example")).toBe(null);
    expect(safeInternalPath("/\\/evil.example")).toBe(null);
  });

  it("rejects absolute URLs and control characters", () => {
    expect(safeInternalPath("https://evil.example")).toBe(null);
    expect(safeInternalPath("javascript:alert(1)")).toBe(null);
    expect(safeInternalPath("/\nhttps://evil.example")).toBe(null);
    expect(safeInternalPath("/account\u0000")).toBe(null);
  });

  it("rejects anything that is not a string", () => {
    expect(safeInternalPath(undefined)).toBe(null);
    expect(safeInternalPath(null)).toBe(null);
    expect(safeInternalPath(42)).toBe(null);
    expect(safeInternalPath(["//evil.example"])).toBe(null);
  });
});
