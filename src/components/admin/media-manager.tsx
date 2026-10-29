"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { createMediaUpload } from "@/app/actions/media";
import { MEDIA_BUCKET, getBrowserClient } from "@/lib/supabase/browser";
import type { MediaRef } from "@/lib/types";
import { cn } from "@/lib/utils";

const IMAGE_LIMIT = 5 * 1024 * 1024;
const VIDEO_LIMIT = 50 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const VIDEO_TYPES = ["video/mp4", "video/webm"];

/**
 * The application session is checked by createMediaUpload before it grants a
 * one-file signed URL. The service key stays on the server.
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
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const upload = async (files: FileList) => {
    setBusy(true);
    setMessage(null);
    const added: MediaRef[] = [];
    const failures: string[] = [];

    try {
      const supabase = getBrowserClient();

      for (const file of Array.from(files)) {
        const isVideo = VIDEO_TYPES.includes(file.type);
        if (!isVideo && !IMAGE_TYPES.includes(file.type)) {
          failures.push(`"${file.name}" must be JPG, PNG, WebP, AVIF, MP4 or WebM.`);
          continue;
        }
        if (file.size === 0 || file.size > (isVideo ? VIDEO_LIMIT : IMAGE_LIMIT)) {
          failures.push(`"${file.name}" exceeds the ${isVideo ? "50 MB video" : "5 MB image"} limit or is empty.`);
          continue;
        }

        const signed = await createMediaUpload(section, slug.trim(), file.type, file.size);
        if ("error" in signed) {
          failures.push(`"${file.name}": ${signed.error}`);
          continue;
        }

        const { error: uploadError } = await supabase.storage
          .from(MEDIA_BUCKET)
          .uploadToSignedUrl(signed.path, signed.token, file, {
            contentType: file.type,
            cacheControl: "31536000",
          });

        if (uploadError) {
          failures.push(`"${file.name}" could not be uploaded. Please try again.`);
          continue;
        }

        added.push({ path: signed.path, url: signed.url, type: isVideo ? "video" : "image", alt: "" });
      }

      if (added.length > 0) onChange([...valueRef.current, ...added]);
      if (failures.length > 0) setMessage(failures.join(" "));
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
          {busy ? "Uploading…" : "Add photos or video"}
        </button>
        <p className="text-xs text-black/40">Photos up to 5 MB · MP4/WebM video up to 50 MB · select several files</p>
        <input
          ref={inputRef}
          type="file"
          accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(",")}
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
          {value.map((item, index) => (
            <li key={item.path} className="rounded-2xl border border-black/10 bg-white p-3">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-sage">
                {item.type === "video" ? (
                  <video src={item.url} controls muted playsInline preload="metadata" className="h-full w-full object-cover" />
                ) : (
                  <Image src={item.url} alt={item.alt || "Uploaded image"} fill sizes="240px" className="object-cover" />
                )}
                {index === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-forest px-2.5 py-1 text-[10px] font-medium text-white">
                    Cover
                  </span>
                )}
              </div>

              <input
                type="text"
                value={item.alt ?? ""}
                onChange={(event) => setAlt(index, event.target.value)}
                placeholder={item.type === "video" ? "Describe this video" : "Describe this photo (alt text)"}
                className="mt-3 w-full rounded-lg border border-black/10 px-3 py-2 text-xs outline-none focus:border-forest"
                aria-label={`Description for media ${index + 1}`}
              />

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Move media up"
                  className={cn("rounded-full border border-black/10 p-1.5 hover:bg-black/5", index === 0 && "opacity-40")}
                >
                  <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === value.length - 1}
                  aria-label="Move media down"
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
                  aria-label="Remove media"
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
          No media yet. The first photo or video becomes the cover; the rest appear on the detail page.
        </p>
      )}
    </div>
  );
}
