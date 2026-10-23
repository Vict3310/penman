import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/login-form";
import { LogoMark } from "@/components/logo";
import { getSessionUser } from "@/lib/auth/current-user";
import { isAuthDatabaseConfigured } from "@/lib/auth/db";
import { safeInternalPath } from "@/lib/safe-path";
import { getSiteSettings } from "@/lib/site";

export const dynamic = "force-dynamic";

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
  const settings = await getSiteSettings();

  // Validated, not merely prefix-checked: "//evil.example" and "/\\evil.example"
  // both begin with a slash and both navigate off-site in a browser.
  const requested = safeInternalPath(next);

  // Already holding a live session? Then there is nothing to sign in for, and
  // this page gets out of the way. This is what makes /login a no-op for an
  // administrator whose session is still valid.
  const existing = await getSessionUser();
  if (existing) {
    redirect(requested ?? (existing.role === "admin" ? "/admin" : "/account"));
  }

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-6 py-20">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <LogoMark />
          <span className="font-display text-sm font-semibold tracking-tight">
            {settings.brand.business_name}
          </span>
        </div>

        <div className="overflow-hidden rounded-[30px] border border-black/10 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 text-center">
            <p className="text-[11px] uppercase tracking-[0.28em] text-black/45">
              {settings.brand.business_name}
            </p>
            <h1 className="mt-3 font-display text-3xl font-light tracking-tight text-ink">
              Welcome back
            </h1>
            <p className="mt-3 text-sm text-black/55">
              Sign in to follow your enquiries and saved vehicles, or to manage the site.
            </p>
          </div>

          {isAuthDatabaseConfigured() ? (
            // No `next` means the action decides from the account's role: an
            // administrator to /admin, everyone else to /account.
            <LoginForm next={requested ?? ""} />
          ) : (
            <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              This deployment has no database configured yet, so accounts cannot be verified. Set
              <span className="mx-1 font-medium">DATABASE_URL</span>
              and run
              <span className="mx-1 font-medium">npm run create-admin</span>
              to create the first administrator.
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-black/60">
          New here?{" "}
          <Link
            href="/signup"
            className="font-medium text-forest underline decoration-forest/30 underline-offset-4 transition-colors hover:decoration-forest"
          >
            Create an account
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-black/45">
          Accounts are managed by this site. Sessions are stored on the server and expire automatically.
        </p>
      </div>
    </main>
  );
}
