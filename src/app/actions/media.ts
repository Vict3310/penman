"use server";

import { requireAdminForAction } from "@/lib/auth/admin";
import { getAdminClient } from "@/lib/supabase/admin";

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

const IMAGE_LIMIT = 5 * 1024 * 1024;
const VIDEO_LIMIT = 50 * 1024 * 1024;

export async function createMediaUpload(
  section: string,
  slug: string,
  contentType: string,
  size: number,
): Promise<{ path: string; token: string; url: string } | { error: string }> {
  if (!(await requireAdminForAction())) return { error: "Administrator access is required." };
  if (!["vehicles", "properties", "products"].includes(section)) return { error: "Invalid media section." };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) {
    return { error: "Save a valid listing slug before uploading media." };
  }
  const extension = MIME_EXTENSIONS[contentType];
  const limit = contentType.startsWith("video/") ? VIDEO_LIMIT : IMAGE_LIMIT;
  if (!extension || !Number.isSafeInteger(size) || size <= 0 || size > limit) {
    return { error: "Unsupported file type or file too large." };
  }

  try {
    const path = `${section}/${slug}/${crypto.randomUUID()}.${extension}`;
    const storage = getAdminClient().storage.from("media");
    const { data, error } = await storage.createSignedUploadUrl(path);
    if (error || !data) return { error: "Could not prepare the upload." };
    return { path, token: data.token, url: storage.getPublicUrl(path).data.publicUrl };
  } catch {
    return { error: "Uploads are unavailable in this environment." };
  }
}
