import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { CompareBar } from "@/components/shop/compare";
import type { SiteSettings } from "@/lib/site";

export function SiteLayoutShell({ settings, children }: { settings: SiteSettings; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteNav businessName={settings.brand.business_name} />
      <main className="flex-1">{children}</main>
      <SiteFooter settings={settings} />
      <CompareBar />
    </div>
  );
}
