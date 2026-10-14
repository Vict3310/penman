import { describe, expect, it } from "vitest";
import { isExplicitAdminFlag } from "@/lib/admin-access";

describe("isExplicitAdminFlag", () => {
  it("accepts only a real boolean true", () => {
    expect(isExplicitAdminFlag({ is_admin: true })).toBe(true);
    expect(isExplicitAdminFlag({ role: "admin" })).toBe(true);
    expect(isExplicitAdminFlag({ is_admin: false })).toBe(false);
    expect(isExplicitAdminFlag({ is_admin: null })).toBe(false);
    expect(isExplicitAdminFlag({ is_admin: "true" })).toBe(false);
    expect(isExplicitAdminFlag({ role: "viewer" })).toBe(false);
    expect(isExplicitAdminFlag({})).toBe(false);
  });
});
