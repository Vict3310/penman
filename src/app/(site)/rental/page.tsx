import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  CalendarRange,
  CarFront,
  CheckCircle2,
  Clock3,
  ShieldCheck,
} from "lucide-react";
import { Figure, VehicleCard } from "@/components/cards";
import { SectionHeading } from "@/components/section-heading";
import { DataModeNotice } from "@/components/data-mode-notice";
import { getFeaturedVehicles } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site";
import { isSupabaseConfigured } from "@/lib/env";
import { whatsappLink } from "@/lib/utils";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Penman Empire Rentals",
  description:
    "Premium rental vehicles for business travel, family trips and long-term hire through Penman Empire.",
  alternates: { canonical: "/rental" },
};

const benefits = [
  {
    icon: ShieldCheck,
    title: "Verified fleet",
    body: "Every vehicle is reviewed before it is published, so you know the standard before you enquire.",
  },
  {
    icon: CalendarRange,
    title: "Flexible hire periods",
    body: "Choose daily, weekly or longer-term arrangements to match your route and travel rhythm.",
  },
  {
    icon: Clock3,
    title: "Fast confirmation",
    body: "Share your dates and we will confirm availability and next steps without endless back-and-forth.",
  },
] as const;

const steps = [
  { title: "Choose your vehicle", body: "Browse the fleet and pick the option that fits the route, passengers and trip style." },
  { title: "Tell us your dates", body: "Share your pickup window, duration and any details that matter for your journey." },
  { title: "We confirm the plan", body: "Our team checks availability and returns the next step directly with you." },
] as const;

export default async function RentalHomePage() {
  const [featuredVehicles, settings] = await Promise.all([getFeaturedVehicles(3), getSiteSettings()]);
  const wa = whatsappLink(settings.contact.whatsapp, `Hello ${settings.brand.business_name}, I'd like to enquire about a rental vehicle.`);
  const configured = isSupabaseConfigured();

  const heroVehicle = featuredVehicles[0];

  return (
    <>
      <section className="shell pb-12 pt-32 sm:pb-16 sm:pt-40">
        <div className="overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-[0_24px_80px_rgba(17,24,39,0.08)]">
          <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-14">
              <p className="eyebrow mb-5">Automobile rentals</p>
              <h1 className="max-w-xl font-display text-4xl font-light leading-[0.95] tracking-tighter text-ink sm:text-5xl lg:text-6xl">
                The right car for
                <span className="font-serif italic text-forest"> wherever life takes you.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-black/65 sm:text-lg">
                Explore rental options for business travel, family trips, and special occasions with a process that feels clear from the start.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/rental/cars" className="btn-primary group">
                  Find your car
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.5} />
                </Link>
                <Link href="/rental/how-it-works" className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-medium text-black/70 transition-colors hover:border-black hover:text-black">
                  How renting works
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-black/60">
                <span className="inline-flex items-center gap-2 rounded-full bg-sage px-3 py-1.5 text-forest">
                  <CalendarRange className="h-4 w-4" strokeWidth={1.5} />
                  Flexible hire periods
                </span>
                <span>Clear availability and direct support</span>
              </div>
            </div>

            <div className="relative min-h-[360px] bg-sage/50 lg:min-h-[520px]">
              {heroVehicle ? (
                <>
                  <Figure images={heroVehicle.images} alt={heroVehicle.name} className="h-full min-h-[360px] lg:min-h-[520px]" sizes="(max-width: 1024px) 100vw, 52vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                    <div className="max-w-sm rounded-2xl border border-white/20 bg-white/12 p-4 text-white backdrop-blur-sm">
                      <p className="text-xs uppercase tracking-[0.25em] text-white/70">Featured hire</p>
                      <div className="mt-2 flex items-end justify-between gap-4">
                        <div>
                          <h2 className="font-display text-2xl font-light tracking-tight">{heroVehicle.name}</h2>
                          <p className="mt-1 text-sm text-white/80">{heroVehicle.rate ? `${heroVehicle.rate} / ${heroVehicle.rate_period}` : "Flexible pricing"}</p>
                        </div>
                        <Link href={`/rental/cars/${heroVehicle.slug}`} className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/25">
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid h-full place-items-center bg-gradient-to-br from-sage to-cream p-8 text-center">
                  <div>
                    <p className="eyebrow mb-3">Premium rental</p>
                    <h2 className="font-display text-3xl font-light tracking-tight text-ink">A faster way to plan your next trip.</h2>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="shell pb-12 sm:pb-16">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="card-surface p-8 sm:p-10">
            <p className="eyebrow mb-4">Why clients choose us</p>
            <h2 className="font-display text-4xl font-light tracking-tighter sm:text-5xl">
              Premium, simple,
              <span className="font-serif italic"> no guesswork.</span>
            </h2>
            <p className="mt-5 max-w-xl text-base text-black/60">
              We keep the rental journey straightforward: a clear fleet, honest availability, and a team that confirms every detail before booking is final.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/rental/cars" className="btn-primary group">
                Browse vehicles
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.5} />
              </Link>
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="border-b border-black/20 pb-1 text-sm text-black/60 hover:border-black hover:text-black">
                  Chat on WhatsApp
                </a>
              )}
            </div>
          </div>

          <div className="card-surface p-8">
            <div className="space-y-5">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="flex gap-4 rounded-2xl border border-black/10 bg-sage/40 p-4">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-white text-forest shadow-sm">
                    <benefit.icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-light tracking-tight">{benefit.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-black/60">{benefit.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {!configured && (
        <section className="shell pb-8">
          <DataModeNotice context="Featured rental vehicles are read from your database." />
        </section>
      )}

      <section className="bg-sage py-24 sm:py-28">
        <div className="shell">
          <SectionHeading
            eyebrow="How it works"
            title="Three easy"
            emphasis="steps."
            description="Our process is designed to be fast, clear and personal — from the first enquiry to handover."
            className="mb-12"
          />
          <div className="grid gap-6 lg:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="card-surface p-7">
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-full bg-white text-forest shadow-sm">
                  <CarFront className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <p className="text-xs uppercase tracking-[0.2em] text-black/40">0{index + 1}</p>
                <h3 className="mt-4 font-display text-2xl font-light tracking-tight">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-black/60">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="shell py-24 sm:py-28">
        <SectionHeading
          eyebrow="Featured vehicles"
          title="Ready when you"
          emphasis="are."
          action={{ href: "/rental/cars", label: "View all rental cars" }}
          description="A small selection of our current options, chosen to show the range of vehicles available for hire."
          className="mb-12"
        />

        {featuredVehicles.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {featuredVehicles.map((vehicle, i) => (
              <div key={vehicle.id} data-reveal style={{ transitionDelay: `${i * 100}ms` }}>
                <VehicleCard vehicle={vehicle} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card-surface p-8 text-sm text-black/60">
            No featured vehicles are available right now. Browse the full fleet when inventory is updated.
          </div>
        )}
      </section>

      <section className="pb-24 sm:pb-32">
        <div className="shell">
          <div className="card-surface overflow-hidden p-8 sm:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="eyebrow mb-4">Need a tailored recommendation?</p>
                <h2 className="font-display text-4xl font-light tracking-tighter sm:text-5xl">
                  Tell us what you need,
                  <span className="font-serif italic"> we’ll sort the rest.</span>
                </h2>
              </div>

              <div className="flex flex-wrap gap-4">
                <Link href="/rental/contact" className="btn-primary group">
                  Contact the rental desk
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.5} />
                </Link>
                <Link href="/rental/cars" className="rounded-full border border-black/10 px-5 py-3 text-sm text-black/70 transition-colors hover:border-black hover:text-black">
                  Browse the fleet
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
