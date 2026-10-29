import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  signed: vi.fn(),
  publicUrl: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({ requireAdminForAction: mocks.admin }));
vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: () => ({
    storage: {
      from: () => ({
        createSignedUploadUrl: mocks.signed,
        getPublicUrl: mocks.publicUrl,
      }),
    },
  }),
}));

import { createMediaUpload } from "@/app/actions/media";

describe("admin media upload signing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.admin.mockResolvedValue({ id: "admin" });
    mocks.signed.mockResolvedValue({ data: { token: "one-file-token" }, error: null });
    mocks.publicUrl.mockImplementation((path: string) => ({ data: { publicUrl: `https://example.test/${path}` } }));
  });

  it("does not sign an upload for a visitor", async () => {
    mocks.admin.mockResolvedValue(null);
    expect(await createMediaUpload("products", "car-post", "video/mp4", 1024)).toEqual({
      error: "Administrator access is required.",
    });
    expect(mocks.signed).not.toHaveBeenCalled();
  });

  it("rejects invalid paths, types and sizes before issuing a token", async () => {
    expect(await createMediaUpload("other", "car-post", "image/jpeg", 1024)).toHaveProperty("error");
    expect(await createMediaUpload("products", "../escape", "image/jpeg", 1024)).toHaveProperty("error");
    expect(await createMediaUpload("products", "car-post", "application/pdf", 1024)).toHaveProperty("error");
    expect(await createMediaUpload("products", "car-post", "image/jpeg", 6 * 1024 * 1024)).toHaveProperty("error");
    expect(await createMediaUpload("products", "car-post", "video/mp4", 51 * 1024 * 1024)).toHaveProperty("error");
    expect(mocks.signed).not.toHaveBeenCalled();
  });

  it("signs a unique path for an authorized video", async () => {
    const result = await createMediaUpload("products", "amg-gle-53", "video/mp4", 20 * 1024 * 1024);
    expect(result).toMatchObject({ token: "one-file-token" });
    expect(result).toHaveProperty("path", expect.stringMatching(/^products\/amg-gle-53\/[0-9a-f-]+\.mp4$/));
    expect(mocks.signed).toHaveBeenCalledWith((result as { path: string }).path);
  });
});
