import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getAdminAllowlist, isAdminEmail, getSiteUrl } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

const ORIGINAL = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL };
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("getAdminAllowlist / isAdminEmail", () => {
  it("returns an empty list when unset", () => {
    delete process.env.ADMIN_EMAIL_ALLOWLIST;
    expect(getAdminAllowlist()).toEqual([]);
    expect(isAdminEmail("anyone@example.com")).toBe(false);
  });

  it("parses, trims and lowercases the allowlist", () => {
    process.env.ADMIN_EMAIL_ALLOWLIST = " Owner@PenmanEmpire.com , ops@penmanempire.com ,,";
    expect(getAdminAllowlist()).toEqual(["owner@penmanempire.com", "ops@penmanempire.com"]);
  });

  it("matches case-insensitively and rejects non-members", () => {
    process.env.ADMIN_EMAIL_ALLOWLIST = "owner@penmanempire.com";
    expect(isAdminEmail("OWNER@penmanempire.com")).toBe(true);
    expect(isAdminEmail("  owner@penmanempire.com ")).toBe(true);
    expect(isAdminEmail("stranger@penmanempire.com")).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });
});

describe("getSiteUrl", () => {
  it("prefers an explicit site URL and strips trailing slashes", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://penmanempire.com/";
    delete process.env.VERCEL_URL;
    expect(getSiteUrl()).toBe("https://penmanempire.com");
  });

  it("falls back to the Vercel URL then localhost", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_URL = "penman-preview.vercel.app";
    expect(getSiteUrl()).toBe("https://penman-preview.vercel.app");

    delete process.env.VERCEL_URL;
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });
});

describe("rateLimit", () => {
  it("allows up to the limit and then blocks with a retry hint", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i += 1) {
      expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    }
    const blocked = rateLimit(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("keeps separate buckets per key", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    rateLimit(a, 1, 60_000);
    expect(rateLimit(a, 1, 60_000).ok).toBe(false);
    expect(rateLimit(b, 1, 60_000).ok).toBe(true);
  });

  it("resets once the window has elapsed", () => {
    const key = `window-${Math.random()}`;
    expect(rateLimit(key, 1, -1).ok).toBe(true); // window already expired
    expect(rateLimit(key, 1, -1).ok).toBe(true);
  });
});
