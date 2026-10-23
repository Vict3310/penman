import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { signOut } from "@/app/actions/auth";
import { requireAdminPage } from "@/lib/auth/admin";
import { adminDashboardCounts } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Renders the site's custom 404 for anyone who is not an administrator.
  const user = await requireAdminPage();
  const settings = await getSiteSettings();
  const counts = await adminDashboardCounts();

  return (
    <AdminShell
      businessName={settings.brand.business_name}
      user={{ email: user.email, fullName: user.fullName }}
      signOut={signOut}
      counts={{
        newRentalEnquiries: counts.newRentalEnquiries,
        newPropertyEnquiries: counts.newPropertyEnquiries,
        newShopEnquiries: counts.newShopEnquiries,
        newContactMessages: counts.newContactMessages,
      }}
    >
      {children}
    </AdminShell>
  );
}
