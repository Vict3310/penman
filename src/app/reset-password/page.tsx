import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordForm } from "@/app/reset-password/reset-password-form";
import { LogoMark } from "@/components/logo";
import { findPasswordResetToken } from "@/lib/auth/reset";
import { getPool, isAuthDatabaseConfigured } from "@/lib/auth/db";
import { getSiteSettings } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

/**
 * Complete a reset.
 *
 * The token is checked here only to avoid showing a password form that cannot
 * work — the authoritative check happens inside the action's transaction, under
 * a row lock. A token is never consumed by rendering this page.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";
  const settings = await getSiteSettings();

  let usable = false;
  let unconfigured = false;

  if (!isAuthDatabaseConfigured()) {
    unconfigured = true;
  } else if (value) {
    try {
      usable = Boolean(await findPasswordResetToken(getPool(), value));
    } catch (error) {
      console.error(
        "Reset token lookup failed:",
        error instanceof Error ? error.message : "unknown error",
      );
    }
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
              Choose a new password
            </h1>
            <p className="mt-3 text-sm text-black/55">
              This link works once. Setting a new password signs out every other device.
            </p>
          </div>

          {usable ? (
            <ResetPasswordForm token={value} />
          ) : (
            <div className="space-y-4">
              <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                {unconfigured
                  ? "This deployment has no database configured yet, so passwords cannot be reset."
                  : "That reset link is invalid, has already been used, or has expired."}
              </p>
              <Link href="/forgot-password" className="btn-primary w-full justify-center">
                Request a new link
              </Link>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-black/60">
          <Link
            href="/login"
            className="font-medium text-forest underline decoration-forest/30 underline-offset-4 transition-colors hover:decoration-forest"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
