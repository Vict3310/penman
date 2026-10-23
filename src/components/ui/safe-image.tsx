"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * The placeholder shown when there is no picture, or the one we have will not
 * load. Shared so the two cases look identical — a visitor should not be able
 * to tell whether an image was never there or has since broken.
 */
export function ImageFallback({ alt, className }: { alt: string; className?: string }) {
  return (
    <div className={cn("grid h-full w-full place-items-center bg-gradient-to-br from-sage to-cream", className)}>
      <span className="px-4 text-center text-xs uppercase tracking-[0.25em] text-forest/50">{alt}</span>
    </div>
  );
}

/**
 * The site's image primitive for stored media.
 *
 * This exists for one thing a plain `next/image` cannot do: react to a file
 * that fails to load. Images served from storage can be replaced or removed
 * out from under a page that is already built, and an imported listing can
 * legitimately have no picture at all. Either way the layout must survive, so
 * a failed load swaps in the same placeholder the empty case uses instead of
 * leaving a broken frame behind.
 *
 * It is a client component, which is why the cards import this rather than
 * `next/image` directly; the rest of the card still renders on the server.
 */
export function SafeImage({
  src,
  alt,
  sizes,
  priority = false,
  className,
}: {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) return <ImageFallback alt={alt} />;

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
