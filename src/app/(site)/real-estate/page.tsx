import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Building2, CheckCircle2, MapPinned, ShieldCheck } from "lucide-react";
import { Figure, PropertyCard } from "@/components/cards";
import { DataModeNotice } from "@/components/data-mode-notice";
import { SectionHeading } from "@/components/section-heading";
import { getFeaturedProperties } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site";
import { isSupabaseConfigured } from "@/lib/env";
import { whatsappLink } from "@/lib/utils";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Real Estate",
  description: "Explore homes, land and commercial property opportunities across Penman Empire Real Estate.",
  alternates: { canonical: "/real-estate" },
};

const reasons = [
  { icon: ShieldCheck, title: "Verified listings", body: "We keep property information accurate and presented clearly so it is easier to shortlist with confidence." },
  { icon: MapPinned, title: "Location-led search", body: "Narrow by area, property type and price so the search reflects the real market you need." },
  { icon: Building2, title: "Practical guidance", body: "Our team helps confirm the best property path for sales, rentals and viewing arrangements." },
] as const;

export default async function RealEstateHomePage() {
  const [featuredProperties, settings] = await Promise.all([getFeaturedProperties(3), getSiteSettings()]);
  const { brand, contact } = settings;
  const wa = whatsappLink(contact.whatsapp, `Hello ${brand.business_name}, I'd like to enquire about a property.`);
  const configured = isSupabaseConfigured();

  const heroProperty = featuredProperties[0];

  return (
    <>
      <section className="shell pb-12 pt-32 sm:pb-16 sm:pt-40">
        <div className="overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-[0_24px_80px_rgba(17,24,39,0.08)]">
          <div className="grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-14">
              <p className="eyebrow mb-5">Real estate</p>
              <h1 className="max-w-xl font-display text-4xl font-light leading-[0.95] tracking-tighter text-ink sm:text-5xl lg:text-6xl">
                Find a place that moves
                <span className="font-serif italic text-forest"> you forward.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-black/65 sm:text-lg">
                Explore property opportunities and talk with our team about the next move that fits your location, budget, and lifestyle.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/real-estate/properties" className="btn-primary group">
                  Explore properties
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.5} />
                </Link>
                <Link href="/real-estate/contact" className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-medium text-black/70 transition-colors hover:border-black hover:text-black">
                  Discuss your needs
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-black/60">
                <span className="inline-flex items-center gap-2 rounded-full bg-sage px-3 py-1.5 text-forest">
                  <MapPinned className="h-4 w-4" strokeWidth={1.5} />
                  Location-aware guidance
                </span>
                <span>Clear property information and direct team support</span>
              </div>
            </div>

            <div className="relative min-h-[360px] bg-sage/50 lg:min-h-[520px]">
              {heroProperty ? (
                <>
                  <Figure images={heroProperty.images} alt={heroProperty.title} className="h-full min-h-[360px] lg:min-h-[520px]" sizes="(max-width: 1024px) 100vw, 52vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                    <div className="max-w-sm rounded-2xl border border-white/20 bg-white/12 p-4 text-white backdrop-blur-sm">
                      <p className="text-xs uppercase tracking-[0.25em] text-white/70">Featured property</p>
                      <div className="mt-2 flex items-end justify-between gap-4">
                        <div>
                          <h2 className="font-display text-2xl font-light tracking-tight">{heroProperty.title}</h2>
                          <p className="mt-1 text-sm text-white/80">{heroProperty.location}</p>
                        </div>
                        <Link href={`/real-estate/${heroProperty.slug}`} className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/25">
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid h-full place-items-center bg-gradient-to-br from-sage to-cream p-8 text-center">
                  <div>
                    <p className="eyebrow mb-3">Property guidance</p>
                    <h2 className="font-display text-3xl font-light tracking-tight text-ink">A clearer way to find the right property.</h2>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="shell pb-12 sm:pb-16">
        <div className="grid gap-6 lg:grid-cols-3">
          <Link href="/real-estate/properties" className="card-surface flex h-full flex-col p-7 transition-shadow hover:shadow-xl hover:shadow-black/10">
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-full bg-sage text-forest">
              <Building2 className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <h2 className="font-display text-2xl font-light tracking-tight">Browse properties</h2>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-black/60">Filter by property type, location, budget and bedroom count to narrow the shortlist.</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-forest">Explore listings <ArrowRight className="h-4 w-4" strokeWidth={1.5} /></span>
          </Link>

          <Link href="/real-estate/services" className="card-surface flex h-full flex-col p-7 transition-shadow hover:shadow-xl hover:shadow-black/10">
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-full bg-sage text-forest">
              <CheckCircle2 className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <h2 className="font-display text-2xl font-light tracking-tight">Property services</h2>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-black/60">Learn how we guide buyers and tenants toward the right property solution and next steps.</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-forest">View services <ArrowRight className="h-4 w-4" strokeWidth={1.5} /></span>
          </Link>

          <Link href="/real-estate/contact" className="card-surface flex h-full flex-col p-7 transition-shadow hover:shadow-xl hover:shadow-black/10">
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-full bg-sage text-forest">
              <MapPinned className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <h2 className="font-display text-2xl font-light tracking-tight">Talk to the team</h2>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-black/60">Send your requirements and we will help narrow the right property options and viewing process.</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-forest">Contact us <ArrowRight className="h-4 w-4" strokeWidth={1.5} /></span>
          </Link>
        </div>
      </section>

      {!configured && (
        <section className="shell pb-8">
          <DataModeNotice context="Featured property listings are read from your database." />
        </section>
      )}

      <section className="bg-sage py-24 sm:py-28">
        <div className="shell">
          <SectionHeading
            eyebrow="Why clients choose us"
            title="Practical property"
            emphasis="guidance."
            description="We focus on transparent recommendations, clear property information and a direct path to the next step."
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
          eyebrow="Featured properties"
          title="Current highlights"
          emphasis="from the market."
          action={{ href: "/real-estate/properties", label: "Browse all properties" }}
          description="A small selection of active listings to help buyers and tenants understand current opportunities."
          className="mb-12"
        />

        {featuredProperties.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {featuredProperties.map((property, index) => (
              <div key={property.id} data-reveal style={{ transitionDelay: `${index * 100}ms` }}>
                <PropertyCard property={property} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card-surface p-8 text-sm text-black/60">
            No featured properties are currently listed. Check the full property catalogue or speak to the team for the latest opportunities.
          </div>
        )}
      </section>

      <section className="pb-24 sm:pb-32">
        <div className="shell">
          <div className="card-surface p-8 sm:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="eyebrow mb-4">Need assistance finding the right property?</p>
                <h2 className="font-display text-4xl font-light tracking-tighter sm:text-5xl">
                  Tell us your goal,
                  <span className="font-serif italic"> we’ll guide the next step.</span>
                </h2>
              </div>
              <div className="flex flex-wrap gap-4">
                <Link href="/real-estate/contact" className="btn-primary group">
                  Contact the property team
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
