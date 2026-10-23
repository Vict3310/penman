"use client";

import { usePathname } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { SiteSidebar } from "@/components/site-sidebar";
import { isSectionHome } from "@/lib/site-sections";
import { cn } from "@/lib/utils";
import type { SiteSettings } from "@/lib/site";

/**
 * The chrome around every public page.
 *
 * Two presentations, chosen by route:
 *
 *   * A HOME PAGE keeps the floating pill navigation. There are five of them:
 *     the site home (`/autos`, and `/` which permanently redirects to it) and
 *     each section's own landing page — /rental, /shop and /real-estate. Every
 *     one is a marketing page, and the navbar is already section-aware, so the
 *     rental home still shows the rental menu.
 *   * EVERY OTHER page gets the persistent sidebar, so the rest of the site
 *     behaves like somewhere you can navigate rather than somewhere you
 *     arrived. The section's own menu travels with it — see railGroups() in
 *     site-sidebar.tsx.
 *
 * The sign-in, sign-up and administration pages are untouched by this: they
 * live outside the `(site)` route group and never reach this shell.
 *
 * The content is offset by `--rail-w` rather than by a hard-coded width, so a
 * collapse animates the page across without this file knowing how wide the
 * rail currently is.
 */
export function SiteLayoutShell({
  settings,
  children,
}: {
  settings: SiteSettings;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // The site home and each section's landing page; see the note above.
  const isHome = isSectionHome(pathname);

  // The footer carries the links to the other sections — shop, real estate — so
  // it belongs at the foot of the same pages that keep the navbar.
  const showFooter = isHome;

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      {isHome ? (
        <SiteNav businessName={settings.brand.business_name} />
      ) : (
        <SiteSidebar businessName={settings.brand.business_name} />
      )}

      <div
        className={cn(
          "flex min-h-screen flex-col",
          !isHome && "rail-offset transition-[padding-left] duration-300 md:pl-[var(--rail-w)]",
        )}
      >
        <main className="flex-1">{children}</main>
        {showFooter ? <SiteFooter settings={settings} /> : null}
      </div>
    </div>
  );
}
