import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  from: vi.fn(),
  upsert: vi.fn(),
  revalidate: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({ requireAdminForAction: mocks.admin }));
vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: () => ({ from: mocks.from }),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));

import { saveSettingsSection } from "@/app/actions/admin";
import { IDLE_RESULT } from "@/lib/action-result";

describe("admin site settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.admin.mockResolvedValue({ id: "admin" });
    mocks.from.mockReturnValue({ upsert: mocks.upsert });
    mocks.upsert.mockResolvedValue({ error: null });
  });

  it("saves edited input values rather than stale hidden payload values", async () => {
    const form = new FormData();
    form.set("payload", JSON.stringify({
      key: "social",
      value: { instagram: "old", tiktok: "old", facebook: "old" },
    }));
    form.set("instagram", "https://www.instagram.com/penman_autos/");
    form.set("tiktok", "https://www.tiktok.com/@penman_autos");
    form.set("facebook", "");

    const result = await saveSettingsSection(IDLE_RESULT, form);

    expect(result.ok).toBe(true);
    expect(mocks.from).toHaveBeenCalledWith("site_settings");
    expect(mocks.upsert).toHaveBeenCalledWith({
      key: "social",
      value: {
        instagram: "https://www.instagram.com/penman_autos/",
        tiktok: "https://www.tiktok.com/@penman_autos",
        facebook: "",
      },
    }, { onConflict: "key" });
  });

  it("does not let a visitor change settings", async () => {
    mocks.admin.mockResolvedValue(null);
    const form = new FormData();
    form.set("payload", JSON.stringify({ key: "social", value: { tiktok: "" } }));
    form.set("tiktok", "https://example.test/");

    const result = await saveSettingsSection(IDLE_RESULT, form);

    expect(result.ok).toBe(false);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
