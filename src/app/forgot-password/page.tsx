import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/app/forgot-password/forgot-password-form";
import { LogoMark } from "@/components/logo";
import { isAuthDatabaseConfigured } from "@/lib/auth/db";
import { getSiteSettings } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};

/**
 * Request a reset link.
 *
 * Deliberately says nothing about whether the address is registered — see the
 * action. The form does not confirm an account exists either; it reports that
 * the request was accepted and to check the inbox.
 */
export default async function ForgotPasswordPage() {
  const settings = await getSiteSettings();

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
              Forgot your password?
            </h1>
            <p className="mt-3 text-sm text-black/55">
              Enter the email address on your account and we will send a link to choose a new one.
            </p>
          </div>

          {isAuthDatabaseConfigured() ? (
            <ForgotPasswordForm />
          ) : (
            <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              This deployment has no database configured yet, so passwords cannot be reset. Set
              <span className="mx-1 font-medium">DATABASE_URL</span>
              first.
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-black/60">
          Remembered it?{" "}
          <Link
            href="/login"
            className="font-medium text-forest underline decoration-forest/30 underline-offset-4 transition-colors hover:decoration-forest"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
