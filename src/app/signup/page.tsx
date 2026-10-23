import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, MessageCircle, ShieldCheck, Zap } from "lucide-react";

import { SignupForm } from "@/app/signup/signup-form";
import { LogoMark } from "@/components/logo";
import { getSessionUser } from "@/lib/auth/current-user";
import { isAuthDatabaseConfigured } from "@/lib/auth/db";
import { getSiteSettings } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Create a Penman Empire account to keep your rental, property and shop enquiries together in one place.",
  robots: { index: false, follow: true },
};

/** What an account actually gets you. No invented benefits. */
const BENEFITS = [
  {
    icon: ClipboardList,
    title: "Every enquiry in one place",
    body: "Follow the rental, property and shop requests you have sent, without searching back through email.",
  },
  {
    icon: Zap,
    title: "Quick to enquire again",
    body: "Your details are recognised, so the second enquiry is faster than the first.",
  },
  {
    icon: ShieldCheck,
    title: "Secured properly",
    body: "Your password is stored as an Argon2id hash and your session is managed on our servers, never in the browser.",
  },
];

export default async function SignupPage() {
  const settings = await getSiteSettings();

  // Someone who already has a session does not need this page.
  const existing = await getSessionUser();
  if (existing) {
    redirect(existing.role === "admin" ? "/admin" : "/account");
  }

  const brand = settings.brand.business_name;
  const whatsapp = settings.contact?.whatsapp;

  return (
    <main className="relative min-h-screen overflow-hidden bg-cream">
      {/* Soft brand wash behind everything. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-sage/50 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-52 -right-32 h-[40rem] w-[40rem] rounded-full bg-leaf/15 blur-3xl"
      />

      <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:py-16">
        {/*
         * ── Form panel ────────────────────────────────────────────────
         *
         * First in the source, so a phone shows the fields immediately rather
         * than a screen of marketing copy before them — and so the keyboard and
         * screen-reader order matches what is on screen. `lg:order-last` moves
         * it to the right-hand column when the two panels sit side by side.
         */}
        <section className="lg:order-last lg:px-4">
          <div className="card-surface p-7 sm:p-9">
            <p className="eyebrow">Get started</p>
            <h2 className="mt-3 font-display text-3xl font-light tracking-tighter text-ink sm:text-4xl">
              Create your account
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-black/55">
              Takes a moment. You only need a name, an email and a password.
            </p>

            <div className="mt-8">
              {isAuthDatabaseConfigured() ? (
                <SignupForm />
              ) : (
                <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                  Accounts cannot be created on this deployment yet, because it has no database
                  configured. Set
                  <span className="mx-1 font-medium">DATABASE_URL</span>
                  and apply the migrations to enable registration.
                </p>
              )}
            </div>

            <div className="mt-8 flex items-center gap-4">
              <span className="h-px flex-1 bg-black/10" />
              <span className="text-[11px] uppercase tracking-[0.2em] text-black/35">or</span>
              <span className="h-px flex-1 bg-black/10" />
            </div>

            <p className="mt-6 text-center text-sm text-black/60">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-forest underline decoration-forest/30 underline-offset-4 transition-colors hover:decoration-forest"
              >
                Sign in
              </Link>
            </p>
          </div>

          <p className="mt-6 px-2 text-center text-xs leading-relaxed text-black/40">
            You can delete your account at any time by contacting the team. We never sell your
            details or use them for advertising.
          </p>
        </section>

        {/* ── Brand panel ─────────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-forest via-forest to-forest-light p-8 text-white shadow-[0_30px_90px_rgba(18,40,26,0.28)] sm:p-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 top-10 h-48 w-48 rounded-full bg-leaf/20 blur-2xl"
          />

          <div className="relative">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <LogoMark tone="light" />
              <span className="font-display text-sm font-semibold tracking-tight">{brand}</span>
            </Link>

            <p className="mt-10 text-[11px] uppercase tracking-[0.3em] text-white/55">
              Customer accounts
            </p>
            <h1 className="mt-4 max-w-xl font-display text-4xl font-light leading-[1.05] tracking-tighter sm:text-5xl">
              Your fleet, your listings,
              <br />
              <em className="font-serif font-normal italic text-white/90">kept together.</em>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/70">
              An account keeps a record of what you have asked about across car rental, cars for
              sale and real estate — so nothing gets lost between enquiries.
            </p>

            <ul className="mt-10 space-y-6">
              {BENEFITS.map((benefit) => (
                <li key={benefit.title} className="flex gap-4">
                  <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10">
                    <benefit.icon className="h-5 w-5 text-white/85" strokeWidth={1.5} />
                  </span>
                  <div>
                    <p className="font-display text-base tracking-tight text-white">{benefit.title}</p>
                    <p className="mt-1 max-w-md text-sm leading-relaxed text-white/65">
                      {benefit.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-10 rounded-2xl border border-white/10 bg-white/10 p-4">
              <p className="flex items-start gap-3 text-sm leading-relaxed text-white/75">
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-white/70" strokeWidth={1.5} />
                <span>
                  An account is entirely optional — you can still browse and send enquiries without
                  one.{" "}
                  <Link href="/contact" className="underline decoration-white/35 underline-offset-2 hover:text-white">
                    Talk to the team
                  </Link>
                  {whatsapp ? " or message us on WhatsApp." : "."}
                </span>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
