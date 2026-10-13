"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { MEDIA_BUCKET, getBrowserClient } from "@/lib/supabase/browser";
import type { MediaRef } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024; // mirrors the bucket's file_size_limit
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/**
 * Uploads straight to Supabase Storage using the signed-in administrator's
 * session. Storage RLS only permits admins to write, so the browser session
 * is not sufficient on its own — the policies are the real gate.
 */
export function MediaManager({
  value,
  onChange,
  section,
  slug,
  error,
}: {
  value: MediaRef[];
  onChange: (next: MediaRef[]) => void;
  section: string;
  slug: string;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const upload = async (files: FileList) => {
    setBusy(true);
    setMessage(null);
    const added: MediaRef[] = [];

    try {
      const supabase = getBrowserClient();

      for (const file of Array.from(files)) {
        if (!ALLOWED.includes(file.type)) {
          setMessage(`"${file.name}" is not a supported image (JPG, PNG, WebP or AVIF).`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          setMessage(`"${file.name}" is larger than 5 MB.`);
          continue;
        }

        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const safeSlug = slug.trim() || "unassigned";
        const path = `${section}/${safeSlug}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(MEDIA_BUCKET)
          .upload(path, file, { cacheControl: "31536000", upsert: false });

        if (uploadError) {
          setMessage("Upload failed. Check your connection and try again.");
          continue;
        }

        const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
        added.push({ path, url: data.publicUrl, alt: "" });
      }

      if (added.length > 0) onChange([...value, ...added]);
    } catch {
      setMessage("Uploads are unavailable — Supabase Storage is not configured in this environment.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const next = [...value];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const a = next[index]!;
    const b = next[target]!;
    next[index] = b;
    next[target] = a;
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const setAlt = (index: number, alt: string) => {
    onChange(value.map((image, i) => (i === index ? { ...image, alt } : image)));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="btn-ghost py-2.5"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" strokeWidth={1.5} />}
          {busy ? "Uploading…" : "Add images"}
        </button>
        <p className="text-xs text-black/40">JPG, PNG, WebP or AVIF · up to 5 MB each</p>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED.join(",")}
          multiple
          className="sr-only"
          onChange={(event) => {
            const files = event.target.files;
            if (files && files.length > 0) void upload(files);
          }}
        />
      </div>

      {message && <p className="mt-3 text-xs text-amber-700">{message}</p>}
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      {value.length > 0 ? (
        <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {value.map((image, index) => (
            <li key={image.path} className="rounded-2xl border border-black/10 bg-white p-3">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-sage">
                <Image src={image.url} alt={image.alt || "Uploaded image"} fill sizes="240px" className="object-cover" />
                {index === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-forest px-2.5 py-1 text-[10px] font-medium text-white">
                    Cover
                  </span>
                )}
              </div>

              <input
                type="text"
                value={image.alt ?? ""}
                onChange={(event) => setAlt(index, event.target.value)}
                placeholder="Describe this image (alt text)"
                className="mt-3 w-full rounded-lg border border-black/10 px-3 py-2 text-xs outline-none focus:border-forest"
                aria-label={`Alt text for image ${index + 1}`}
              />

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Move image up"
                  className={cn("rounded-full border border-black/10 p-1.5 hover:bg-black/5", index === 0 && "opacity-40")}
                >
                  <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === value.length - 1}
                  aria-label="Move image down"
                  className={cn(
                    "rounded-full border border-black/10 p-1.5 hover:bg-black/5",
                    index === value.length - 1 && "opacity-40",
                  )}
                >
                  <ArrowDown className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label="Remove image"
                  className="ml-auto rounded-full border border-red-500/30 p-1.5 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed border-black/15 px-4 py-8 text-center text-sm text-black/40">
          No images yet. The first image becomes the cover.
        </p>
      )}
    </div>
  );
}
