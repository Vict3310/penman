"use client";

import Image from "next/image";
import { useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { isVideoMedia, type MediaRef } from "@/lib/types";

export function Gallery({ images, alt }: { images: MediaRef[]; alt: string }) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="grid aspect-[4/3] w-full place-items-center rounded-2xl border border-black/10 bg-gradient-to-br from-sage to-cream">
        <span className="text-xs uppercase tracking-[0.25em] text-forest/50">No media provided</span>
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)]!;

  return (
    <div>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.75rem] border border-black/10 bg-sage shadow-[0_12px_36px_rgba(18,32,26,0.08)]">
        {isVideoMedia(current) ? (
          <video
            key={current.path}
            src={current.url}
            controls
            playsInline
            preload="metadata"
            poster={images.find((item) => !isVideoMedia(item))?.url}
            aria-label={current.alt || `${alt} video`}
            className="h-full w-full object-contain"
          />
        ) : (
          <Image
            src={current.url}
            alt={current.alt || alt}
            fill
            sizes="(max-width: 1024px) 100vw, 60vw"
            priority
            className="object-cover"
          />
        )}
      </div>

      {(current.credit || current.license) && (
        <p className="mt-2 text-xs text-black/50">
          {isVideoMedia(current) ? "Video" : "Photo"}{current.credit ? ` by ${current.credit}` : ""}
          {current.source_url && (
            <> · <a href={current.source_url} target="_blank" rel="noopener noreferrer" className="underline">Source</a></>
          )}
          {current.license && (
            <> · {current.license_url ? <a href={current.license_url} target="_blank" rel="noopener noreferrer" className="underline">{current.license}</a> : current.license}</>
          )}
        </p>
      )}

      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-3">
          {images.map((item, index) => (
            <button
              key={`${item.path}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show ${isVideoMedia(item) ? "video" : "photo"} ${index + 1}`}
              aria-current={index === active}
              className={cn(
                "relative aspect-square overflow-hidden rounded-xl border transition-all duration-200",
                index === active ? "border-forest ring-2 ring-forest/30" : "border-black/10 opacity-70 hover:opacity-100",
              )}
            >
              {isVideoMedia(item) ? (
                <>
                  <video src={item.url} muted playsInline preload="metadata" className="pointer-events-none h-full w-full object-cover" />
                  <span className="absolute inset-0 grid place-items-center bg-black/20 text-white"><Play className="h-6 w-6 fill-current" /></span>
                </>
              ) : (
                <Image src={item.url} alt={item.alt || `${alt} thumbnail ${index + 1}`} fill sizes="10vw" className="object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
