"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const REVEAL_SELECTOR = "[data-reveal], [data-panel-img]";

/**
 * React port of the motion layer in design.html:
 *   * `[data-reveal]` and `[data-panel-img]` scroll-reveal via IntersectionObserver
 *   * `[data-reveal-words]` progressive word reveal
 *   * `[data-parallax]` scroll parallax
 *
 * IMPORTANT: this component is mounted in the root layout, which Next.js keeps
 * alive across client-side navigations. A one-shot effect would therefore only
 * ever observe the elements present on first load, leaving everything on
 * subsequently visited pages stuck at `opacity: 0`. Two mechanisms prevent that:
 *
 *   1. the effect re-runs whenever the route changes, and
 *   2. a MutationObserver picks up elements added later (Suspense boundaries,
 *      streamed content, pagination).
 *
 * Both are guarded by per-element flags so scanning is idempotent — re-wrapping
 * already-split words would nest spans and corrupt the text.
 */
export function MotionProvider() {
  const pathname = usePathname();

  useEffect(() => {
    const reveal = (el: HTMLElement) => el.classList.add("is-in");
    const wrappedWords = new WeakSet<Element>();
    const boundRevealTargets = new WeakSet<Element>();

    // Without IntersectionObserver (or with reduced motion) show everything.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach(reveal);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal(entry.target as HTMLElement);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );

    /** Split an element's text into per-word spans — exactly once. */
    const wrapWords = (root: HTMLElement) => {
      if (wrappedWords.has(root)) return;
      wrappedWords.add(root);

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

    const considerElement = (el: Element) => {
      const html = el as HTMLElement;
      if (el.matches("[data-reveal-words]")) {
        wrapWords(html);
      }
      if (el.matches(REVEAL_SELECTOR)) {
        if (boundRevealTargets.has(html)) return;
        boundRevealTargets.add(html);
        observer.observe(html);
      }
    };

    let parallaxLayers: HTMLElement[] = [];

    /** Observe every not-yet-seen reveal element in the given subtree. */
    const scan = (scope: ParentNode) => {
      if (scope instanceof Element) considerElement(scope);
      scope.querySelectorAll("[data-reveal-words]").forEach(considerElement);
      scope.querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
        const html = el as HTMLElement;
        if (boundRevealTargets.has(html)) return;
        boundRevealTargets.add(html);
        observer.observe(html);
      });
      parallaxLayers = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    };

    scan(document);

    // Catch content that arrives after this effect ran: route transitions,
    // Suspense boundaries and streamed server components.
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

    return () => {
      observer.disconnect();
      mutation.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
    // Re-runs on every route change so freshly rendered pages are observed.
  }, [pathname]);

  return null;
}
