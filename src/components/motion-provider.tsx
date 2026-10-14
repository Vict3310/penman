"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const REVEAL_SELECTOR = "[data-reveal], [data-panel-img]";

/**
 * React port of the motion layer in design.html:
 *   * `[data-reveal]` and `[data-panel-img]` scroll-reveal via IntersectionObserver
 *   * `[data-reveal-words]` progressive word reveal
 *   * `[data-parallax]` scroll parallax
 *
 * IMPORTANT: this component is mounted in the root layout, which Next.js keeps
 * alive across client-side navigations. Anything that only runs once on mount
 * therefore only ever sees the elements from the first page.
 *
 * A previous revision re-created the IntersectionObserver on every route change
 * *and* flagged each element with `data-reveal-bound`. That combination is
 * subtly broken: the cleanup calls `disconnect()`, which drops every pending
 * observation, while the next scan skips those same elements because they are
 * already flagged as "bound". The elements end up observed by nobody, so they
 * stay at `opacity: 0` until a hard refresh — exactly the "text and listings
 * only appear when I reload" symptom.
 *
 * The fix: there is exactly ONE observer for the lifetime of the app and it is
 * never disconnected while navigating. A WeakSet mirrors what it is currently
 * watching, so scans are still idempotent (never double-observe) but an element
 * can always be re-observed if it was missed.
 */
export function MotionProvider() {
  const pathname = usePathname();
  const scanRef = useRef<((scope: ParentNode) => void) | null>(null);

  // ── one-shot setup: observer, word wrapping, parallax ──────────────────
  useEffect(() => {
    const observed = new WeakSet<Element>();

    const revealAll = () => {
      document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((el) => el.classList.add("is-in"));
    };

    // Without IntersectionObserver (or with reduced motion) show everything.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      revealAll();
      scanRef.current = revealAll;
      return () => {
        scanRef.current = null;
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).classList.add("is-in");
          observer.unobserve(entry.target);
          observed.delete(entry.target);
        }
      },
      { threshold: 0.15 },
    );

    /** Split an element's text into per-word spans — exactly once. */
    const wrapWords = (root: HTMLElement) => {
      if (root.dataset.wordsWrapped === "true") return;
      root.dataset.wordsWrapped = "true";

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];
      let node = walker.nextNode();
      while (node) {
        if (node.textContent && node.textContent.trim() !== "") textNodes.push(node as Text);
        node = walker.nextNode();
      }

      let index = 0;
      textNodes.forEach((textNode) => {
        const parts = (textNode.textContent ?? "").split(/(\s+)/);
        const fragment = document.createDocumentFragment();
        parts.forEach((part) => {
          if (part.trim() === "") {
            fragment.appendChild(document.createTextNode(part));
            return;
          }
          const span = document.createElement("span");
          span.className = "word-reveal";
          span.style.transitionDelay = `${index * 45}ms`;
          span.textContent = part;
          fragment.appendChild(span);
          index += 1;
        });
        textNode.parentNode?.replaceChild(fragment, textNode);
      });
    };

    const observeIfNeeded = (el: Element) => {
      if (observed.has(el)) return;
      observed.add(el);
      observer.observe(el as HTMLElement);
    };

    let parallaxLayers: HTMLElement[] = [];

    /** Observe every not-yet-seen reveal element in the given subtree. */
    const scan = (scope: ParentNode) => {
      if (scope instanceof Element) {
        if (scope.matches("[data-reveal-words]")) wrapWords(scope as HTMLElement);
        if (scope.matches(REVEAL_SELECTOR)) observeIfNeeded(scope);
      }
      scope.querySelectorAll<HTMLElement>("[data-reveal-words]").forEach(wrapWords);
      scope.querySelectorAll(REVEAL_SELECTOR).forEach(observeIfNeeded);
      parallaxLayers = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    };

    scanRef.current = scan;
    scan(document);

    // Catches late-arriving content within a page: Suspense boundaries, streamed
    // server components, filter results.
    const mutation = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((added) => {
          if (added.nodeType === Node.ELEMENT_NODE) scan(added as Element);
        });
      }
    });
    mutation.observe(document.body, { childList: true, subtree: true });

    // ── parallax ────────────────────────────────────────────────────────
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        parallaxLayers.forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.bottom > 0 && rect.top < window.innerHeight) {
            const speed = Number.parseFloat(el.dataset.parallax ?? "0");
            const sign = el.closest("[data-parallax-invert]") ? -0.3 : 1;
            const offset = ((window.scrollY * speed * sign) % 600).toFixed(1);
            el.style.transform = `translateY(${offset}px)`;
          }
        });
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // Only runs on a real unmount (i.e. essentially never for a root-layout
    // provider) — route changes must NOT tear the observer down.
    return () => {
      observer.disconnect();
      mutation.disconnect();
      window.removeEventListener("scroll", onScroll);
      scanRef.current = null;
    };
  }, []);

  // ── rescan after every route change ────────────────────────────────────
  // The layout survives navigation, so the setup effect above never re-runs.
  // The new page's DOM is committed by the time this effect fires.
  useEffect(() => {
    scanRef.current?.(document);
  }, [pathname]);

  return null;
}
