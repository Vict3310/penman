"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const REVEAL_SELECTOR = "[data-reveal], [data-panel-img], [data-reveal-words]";

/**
 * Animate without changing classes, styles or text nodes on server-rendered
 * elements. A streamed Suspense boundary can hydrate after this effect runs;
 * DOM mutations here would cause a hydration mismatch.
 */
export function MotionProvider() {
  const pathname = usePathname();

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || typeof IntersectionObserver === "undefined" ||
        typeof Element.prototype.animate !== "function") return;

    const seen = new WeakSet<Element>();
    const parallax = new Map<HTMLElement, Animation>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          observer.unobserve(element);

          const panel = element.hasAttribute("data-panel-img");
          const rawDelay = element.style.transitionDelay.trim();
          const delay = rawDelay.endsWith("ms")
            ? Number.parseFloat(rawDelay)
            : rawDelay.endsWith("s")
              ? Number.parseFloat(rawDelay) * 1000
              : 0;

          element.animate(
            panel
              ? [
                  { transform: "translateY(6%) scale(1.035)" },
                  { transform: "translateY(0) scale(1)" },
                ]
              : [
                  { opacity: 0.5, transform: "translateY(20px)", filter: "blur(4px)" },
                  { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
                ],
            {
              duration: panel ? 900 : 650,
              delay: Number.isFinite(delay) ? Math.max(0, delay) : 0,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              fill: "both",
            },
          );
        }
      },
      { threshold: 0.12 },
    );

    const scan = (root: ParentNode) => {
      const reveal = (element: Element) => {
        if (seen.has(element)) return;
        seen.add(element);
        observer.observe(element);
      };
      const addParallax = (element: Element) => {
        const layer = element as HTMLElement;
        if (parallax.has(layer)) return;
        const animation = layer.animate(
          [{ transform: "translateY(-600px)" }, { transform: "translateY(600px)" }],
          { duration: 1200, fill: "both" },
        );
        animation.pause();
        animation.currentTime = 600;
        parallax.set(layer, animation);
      };

      if (root instanceof Element) {
        if (root.matches(REVEAL_SELECTOR)) reveal(root);
        if (root.matches("[data-parallax]")) addParallax(root);
      }
      root.querySelectorAll(REVEAL_SELECTOR).forEach(reveal);
      root.querySelectorAll("[data-parallax]").forEach(addParallax);
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        for (const [layer, animation] of parallax) {
          if (!layer.isConnected) {
            animation.cancel();
            parallax.delete(layer);
            continue;
          }
          const rect = layer.getBoundingClientRect();
          if (rect.bottom <= 0 || rect.top >= window.innerHeight) continue;
          const speed = Number.parseFloat(layer.dataset.parallax ?? "0");
          const sign = layer.closest("[data-parallax-invert]") ? -0.3 : 1;
          const offset = (window.scrollY * speed * sign) % 600;
          animation.currentTime = 600 + (Number.isFinite(offset) ? offset : 0);
        }
        ticking = false;
      });
    };

    scan(document);
    onScroll();

    // Suspense and client navigation can add content after the first scan.
    // WAAPI leaves attributes and text untouched while React hydrates it.
    const mutation = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) scan(node as Element);
        }
      }
      onScroll();
    });
    mutation.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      mutation.disconnect();
      window.removeEventListener("scroll", onScroll);
      for (const animation of parallax.values()) animation.cancel();
    };
  }, [pathname]);

  return null;
}
