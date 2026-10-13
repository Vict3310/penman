"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { MediaRef } from "@/lib/types";

export function Gallery({ images, alt }: { images: MediaRef[]; alt: string }) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="grid aspect-[4/3] w-full place-items-center rounded-2xl border border-black/10 bg-gradient-to-br from-sage to-cream">
        <span className="text-xs uppercase tracking-[0.25em] text-forest/50">No image provided</span>
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)]!;

  return (
    <div>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-black/10 bg-sage">
        <Image
          src={current.url}
          alt={current.alt || alt}
          fill
          sizes="(max-width: 1024px) 100vw, 60vw"
          priority
          className="object-cover"
        />
      </div>

      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-3">
          {images.map((image, index) => (
            <button
              key={`${image.path}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show image ${index + 1}`}
              aria-current={index === active}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg border transition-all duration-200",
                index === active ? "border-forest ring-2 ring-forest/30" : "border-black/10 opacity-70 hover:opacity-100",
              )}
            >
              <Image src={image.url} alt={image.alt || `${alt} thumbnail ${index + 1}`} fill sizes="10vw" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
