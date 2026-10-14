import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LogoMark } from "@/components/logo";
import { isClerkConfigured } from "@/lib/env";
import { isDemoMode } from "@/lib/demo";
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

  const existing = await currentUser();
  if (existing) redirect(next && next.startsWith("/") ? next : "/admin");

  const settings = await getSiteSettings();
  const configured = isClerkConfigured() || isDemoMode();
  const demo = isDemoMode();

  if (demo) redirect("/admin");

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-6 py-20">
      <div className="w-full max-w-md">
        <div className="mb-10 flex items-center justify-center gap-2.5">
          <LogoMark />
          <span className="font-display text-sm font-semibold tracking-tight">
            {settings.brand.business_name}
          </span>
        </div>

        {!configured ? (
          <div className="card-surface p-8">
            <h1 className="font-display text-3xl font-light tracking-tight">Administration</h1>
            <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              Clerk is not configured on this deployment yet, so sign-in is unavailable. Add the Clerk
              publishable and secret keys before enabling admin access.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-sm">
            <SignIn
              path="/login"
              routing="path"
              signUpUrl="/signup"
              forceRedirectUrl={next && next.startsWith("/") ? next : "/admin"}
              appearance={{
                elements: {
                  rootBox: "mx-auto w-full",
                  card: "shadow-none border-0 rounded-none",
                },
              }}
            />
          </div>
        )}
      </div>
    </main>
  );
}
