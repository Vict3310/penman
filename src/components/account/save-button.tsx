"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { Bookmark, Check, Loader2 } from "lucide-react";

import { toggleSavedListing } from "@/app/actions/account";
import {
  getAccountServerSnapshot,
  getAccountSnapshot,
  setSavedState,
  subscribeToAccount,
} from "@/components/account/account-state";
import { cn } from "@/lib/utils";
import type { SavedKind } from "@/lib/types";

/**
 * Save or unsave a listing.
 *
 * Behaviour worth knowing:
 *
 *   * It is a SIBLING of the listing's link, never a descendant. A button
 *     nested inside an `<a>` is invalid HTML and clicking it would navigate
 *     instead of saving, so every card places this next to the link rather
 *     than inside it.
 *   * It updates optimistically — the icon fills on the tap, not after a
 *     round trip — and reverts if the server disagrees. The toast region
 *     announces the failure, so the correction is not silent.
 *   * A signed-out visitor is sent to the sign-in page carrying the current
 *     path, so they come back to the listing they were looking at.
 *   * `aria-pressed` carries the state, so a screen reader announces "Save
 *     Toyota Corolla, toggle button, pressed" rather than an unlabelled icon.
 */
export function SaveButton({
  kind,
  listingId,
  title,
  variant = "floating",
  className,
}: {
  kind: SavedKind;
  listingId: string;
  title: string;
  variant?: "floating" | "inline";
  className?: string;
}) {
  const account = useSyncExternalStore(
    subscribeToAccount,
    getAccountSnapshot,
    getAccountServerSnapshot,
  );
  const saved = account.saved[kind].has(listingId);

  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  function toggle() {
    const next = !saved;
    setSavedState(kind, listingId, next);

    startTransition(async () => {
      const result = await toggleSavedListing(kind, listingId, next);

      if (result.requiresAuth) {
        setSavedState(kind, listingId, !next);
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      if (!result.ok) {
        // Put the toggle back the way it was and say why.
        setSavedState(kind, listingId, !next);
        setMessage(result.message);
        window.setTimeout(() => setMessage(null), 4000);
        return;
      }

      setMessage(result.saved ? "Saved to your account." : "Removed from your saved listings.");
      window.setTimeout(() => setMessage(null), 3000);

      // On the account pages the saved list IS the page, so a toggle changes
      // what should be on screen. Everywhere else there is nothing to re-render.
      if (pathname.startsWith("/account")) router.refresh();
    });
  }

  const label = saved ? `Remove ${title} from saved listings` : `Save ${title}`;

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        aria-label={label}
        title={saved ? "Saved — tap to remove" : "Save for later"}
        data-testid={`save-${kind}-${listingId}`}
        className={cn(
          "group/save inline-flex items-center gap-2 rounded-full border transition-all duration-300 active:scale-95 disabled:opacity-70",
          variant === "floating"
            ? "h-9 w-9 justify-center border-white/60 bg-white/90 shadow-lg shadow-black/10 backdrop-blur hover:bg-white"
            : "border-black/15 bg-white/70 px-4 py-2.5 text-sm font-medium hover:bg-white",
          className,
        )}
      >
        {pending ? (
          <Loader2
            className={cn("h-4 w-4 animate-spin", saved ? "text-forest" : "text-black/50")}
            strokeWidth={1.5}
          />
        ) : saved ? (
          <Bookmark className="h-4 w-4 fill-forest text-forest" strokeWidth={1.5} />
        ) : (
          <Bookmark className="h-4 w-4 text-black/50 transition-colors group-hover/save:text-forest" strokeWidth={1.5} />
        )}
        {variant === "inline" && <span>{saved ? "Saved" : "Save"}</span>}
      </button>

      {/*
       * Announced to assistive technology without stealing focus. The visible
       * state is the filled bookmark; this exists so the outcome is not
       * communicated by colour and shape alone.
       */}
      <span role="status" aria-live="polite" className="sr-only">
        {message ?? ""}
      </span>

      {variant === "floating" && message && (
        <span className="pointer-events-none absolute -top-9 right-0 z-20 whitespace-nowrap rounded-full bg-forest px-3 py-1 text-[11px] font-medium text-white shadow-lg">
          {message}
        </span>
      )}

      {variant === "inline" && message && (
        <span className="text-xs text-black/55">{message}</span>
      )}
    </>
  );
}

/** A compact confirmation badge for lists where a full button would crowd. */
export function SavedBadge({ title }: { title: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-forest/20 bg-sage px-2.5 py-1 text-[11px] font-medium text-forest">
      <Check className="h-3 w-3" strokeWidth={2} />
      {title}
    </span>
  );
}
