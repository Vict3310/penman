import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { LogoMark } from "@/components/logo";
import { getAdminUser } from "@/lib/auth";
import { isBetterAuthConfigured } from "@/lib/env";
import { isDemoMode } from "@/lib/demo";
import { getSiteSettings } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Already signed in as an admin? Go straight through.
  const existing = await getAdminUser();
  if (existing) redirect(next && next.startsWith("/") ? next : "/admin");

  const settings = await getSiteSettings();
  const configured = isBetterAuthConfigured();
  const demo = isDemoMode();

  if (demo) redirect("/admin");

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-6 py-20">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-10 flex items-center justify-center gap-2.5">
          <LogoMark />
          <span className="font-display text-sm font-semibold tracking-tight">
            {settings.brand.business_name}
          </span>
        </Link>

        <div className="card-surface p-8">
          <h1 className="font-display text-3xl font-light tracking-tight">Administration</h1>
          <p className="mt-3 text-sm text-black/50">
            Sign in with your administrator account to manage listings, enquiries and site content.
          </p>

          {!configured && (
            <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              Better Auth is not configured on this deployment yet, so sign-in is unavailable. Set the
              database URL and secret in .env.local before enabling admin access.
            </p>
          )}

          <div className="mt-8">
            <LoginForm next={next && next.startsWith("/") ? next : "/admin"} disabled={!configured} />
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-black/40">
          Administrator accounts are created deliberately — members of the public cannot register here. See the
          README for how to create the first administrator.
        </p>
      </div>
    </main>
  );
}
