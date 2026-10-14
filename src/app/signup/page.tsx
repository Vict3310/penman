import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignupForm } from "@/app/signup/signup-form";
import { getAdminUser } from "@/lib/admin-access";
import { getSiteSettings } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create account",
  robots: { index: false, follow: false },
};

export default async function SignupPage() {
  const existing = await getAdminUser();
  if (existing) redirect("/admin");

  const settings = await getSiteSettings();

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-6 py-20">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-10 flex items-center justify-center gap-2.5">
          <span className="font-display text-sm font-semibold tracking-tight">
            {settings.brand.business_name}
          </span>
        </Link>

        <div className="card-surface p-8">
          <h1 className="font-display text-3xl font-light tracking-tight">Create account</h1>
          <p className="mt-3 text-sm text-black/50">
            Sign up as a staff member or business owner. Public sign-up never grants admin access.
          </p>

          <div className="mt-8">
            <SignupForm />
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-black/40">
          Already have an account? <Link href="/signin" className="font-medium text-black underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
