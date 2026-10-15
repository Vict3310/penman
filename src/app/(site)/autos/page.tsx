import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, Building2, CarFront, Clock3, Headphones, ShieldCheck } from "lucide-react";
import { Figure, VehicleCard } from "@/components/cards";
import { DataModeNotice } from "@/components/data-mode-notice";
import { SectionHeading } from "@/components/section-heading";
import { getFeaturedVehicles } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site";
import { isSupabaseConfigured } from "@/lib/env";
import { whatsappLink } from "@/lib/utils";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Penman Empire Autos",
  description: "Explore premium cars for sale and rental vehicles from Penman Empire, with a simple process and direct support from the team.",
  alternates: { canonical: "/autos" },
};

const reasons = [
  { icon: ShieldCheck, title: "Verified stock", body: "We publish vehicles that are checked carefully before they are shown." },
  { icon: Clock3, title: "Fast responses", body: "Tell us your need and we will confirm the next step without unnecessary delays." },
  { icon: Headphones, title: "One team", body: "Rental, sales and guidance all run through the same direct support line." },
] as const;

const services = [
  { href: "/shop", label: "Cars for sale", description: "Browse the current inventory and ask about pricing and availability." },
  { href: "/rental", label: "Car rental", description: "Choose daily, weekly or longer vehicle hire with a clear booking process." },
  { href: "/autos/about", label: "About Autos", description: "Learn how Penman Empire supports vehicle buyers and drivers." },
] as const;

export default async function AutosHomePage() {
  const [featuredVehicles, settings] = await Promise.all([getFeaturedVehicles(3), getSiteSettings()]);
  const { brand, contact } = settings;
  const wa = whatsappLink(contact.whatsapp, `Hello ${brand.business_name}, I'd like to enquire about a vehicle.`);
  const configured = isSupabaseConfigured();

  const heroVehicle = featuredVehicles[0];

  return (
    <>
      <section className="shell pb-12 pt-32 sm:pb-16 sm:pt-40">
        <div className="overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-[0_24px_80px_rgba(17,24,39,0.08)]">
          <div className="grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-14">
              <p className="eyebrow mb-5">Autos</p>
              <h1 className="max-w-xl font-display text-4xl font-light leading-[0.95] tracking-tighter text-ink sm:text-5xl lg:text-6xl">
                Find your next car
                <span className="font-serif italic text-forest"> with confidence.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-black/65 sm:text-lg">
                Explore vehicles that match your plans, whether you are buying, renting, or comparing the right fit for your next move.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/autos/cars" className="btn-primary group">
                  Explore cars
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.5} />
                </Link>
                <Link href="/autos/contact" className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-medium text-black/70 transition-colors hover:border-black hover:text-black">
                  Speak to our team
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-black/60">
                <span className="inline-flex items-center gap-2 rounded-full bg-sage px-3 py-1.5 text-forest">
                  <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
                  Straightforward enquiries
                </span>
                <span>Direct support from the team</span>
              </div>
            </div>

            <div className="relative min-h-[360px] bg-sage/50 lg:min-h-[520px]">
              {heroVehicle ? (
                <>
                  <Figure images={heroVehicle.images} alt={heroVehicle.name} className="h-full min-h-[360px] lg:min-h-[520px]" sizes="(max-width: 1024px) 100vw, 52vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                    <div className="max-w-sm rounded-2xl border border-white/20 bg-white/12 p-4 text-white backdrop-blur-sm">
                      <p className="text-xs uppercase tracking-[0.25em] text-white/70">Featured option</p>
                      <div className="mt-2 flex items-end justify-between gap-4">
                        <div>
                          <h2 className="font-display text-2xl font-light tracking-tight">{heroVehicle.name}</h2>
                          <p className="mt-1 text-sm text-white/80">{heroVehicle.category}</p>
                        </div>
                        <Link href={heroVehicle.slug ? `/autos/cars/${heroVehicle.slug}` : "/autos/cars"} className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/25">
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid h-full place-items-center bg-gradient-to-br from-sage to-cream p-8 text-center">
                  <div>
                    <p className="eyebrow mb-3">Premium mobility</p>
                    <h2 className="font-display text-3xl font-light tracking-tight text-ink">A better way to find your next vehicle.</h2>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="shell pb-12 sm:pb-16">
        <div className="grid gap-6 lg:grid-cols-3">
          {services.map((service) => (
            <Link key={service.href} href={service.href} className="card-surface flex h-full flex-col p-7 transition-shadow hover:shadow-xl hover:shadow-black/10">
              <div className="mb-5 grid h-12 w-12 place-items-center rounded-full bg-sage text-forest">
                {service.href.includes("rental") ? <CarFront className="h-5 w-5" strokeWidth={1.5} /> : service.href.includes("about") ? <Building2 className="h-5 w-5" strokeWidth={1.5} /> : <BadgeCheck className="h-5 w-5" strokeWidth={1.5} />}
              </div>
              <h2 className="font-display text-2xl font-light tracking-tight">{service.label}</h2>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-black/60">{service.description}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-forest">
                Explore <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {!configured && (
        <section className="shell pb-8">
          <DataModeNotice context="Featured vehicle listings are read from your database." />
        </section>
      )}

      <section className="bg-sage py-24 sm:py-28">
        <div className="shell">
          <SectionHeading
            eyebrow="Why choose us"
            title="Simple guidance,"
            emphasis="better decisions."
            description="We keep the vehicle process clear so you can compare options, ask the right questions and move forward with confidence."
            className="mb-12"
          />
          <div className="grid gap-6 md:grid-cols-3">
            {reasons.map((reason, index) => (
              <div key={reason.title} data-reveal style={{ transitionDelay: `${index * 100}ms` }} className="card-surface p-7">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-forest shadow-sm">
                  <reason.icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <h3 className="mt-5 font-display text-2xl font-light tracking-tight">{reason.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-black/60">{reason.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="shell py-24 sm:py-28">
        <SectionHeading
          eyebrow="Featured vehicles"
          title="Popular picks from"
          emphasis="our fleet."
          action={{ href: "/autos/cars", label: "Browse all cars" }}
          description="A small selection of current vehicles to help you quickly narrow your next move."
          className="mb-12"
        />

        {featuredVehicles.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {featuredVehicles.map((vehicle, index) => (
              <div key={vehicle.id} data-reveal style={{ transitionDelay: `${index * 100}ms` }}>
                <VehicleCard vehicle={vehicle} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card-surface p-8 text-sm text-black/60">
            No featured vehicles are available right now. Check back soon or speak to the team for the latest options.
          </div>
        )}
      </section>

      <section className="pb-24 sm:pb-32">
        <div className="shell">
          <div className="card-surface p-8 sm:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="eyebrow mb-4">Need a direct answer?</p>
                <h2 className="font-display text-4xl font-light tracking-tighter sm:text-5xl">
                  Tell us what you need,
                  <span className="font-serif italic"> we’ll guide you.</span>
                </h2>
              </div>
              <div className="flex flex-wrap gap-4">
                <Link href="/autos/contact" className="btn-primary group">
                  Contact the autos team
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.5} />
                </Link>
                {wa && (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-full border border-black/10 px-5 py-3 text-sm text-black/70 transition-colors hover:border-black hover:text-black">
                    WhatsApp us
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
