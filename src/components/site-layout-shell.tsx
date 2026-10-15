"use client";

import { usePathname } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import type { SiteSettings } from "@/lib/site";

export function SiteLayoutShell({
  settings,
  children,
}: {
  settings: SiteSettings;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showFooter = pathname === "/" || pathname === "/autos";

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteNav businessName={settings.brand.business_name} />
      <main className="flex-1">{children}</main>
      {showFooter ? <SiteFooter settings={settings} /> : null}
    </div>
  );
}
