import { SiteLayoutShell } from "@/components/site-layout-shell";
import { getSiteSettings } from "@/lib/site";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();

  return <SiteLayoutShell settings={settings}>{children}</SiteLayoutShell>;
}
