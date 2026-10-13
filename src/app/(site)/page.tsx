import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CarFront,
  Headphones,
  ShieldCheck,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { ProductCard, PropertyCard, VehicleCard } from "@/components/cards";
import { SectionHeading } from "@/components/section-heading";
import { DataModeNotice } from "@/components/data-mode-notice";
import { EmptyState } from "@/components/ui/misc";
import { getFeaturedProducts, getFeaturedProperties, getFeaturedVehicles } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site";
import { isSupabaseConfigured } from "@/lib/env";
import { whatsappLink } from "@/lib/utils";

export const revalidate = 60;

const BUSINESSES = [
  {
    key: "rental",
    letter: "A",
    icon: CarFront,
    title: "Automobile rentals",
    body: "Well-maintained saloons, SUVs and buses available by the day, week or month — with clear terms and honest pricing.",
    href: "/rental",
    cta: "Browse the fleet",
  },
  {
    key: "real-estate",
    letter: "B",
    icon: Building2,
    title: "Real estate",
    body: "Homes, land and commercial space for sale or to let, presented with the details that actually matter.",
    href: "/real-estate",
    cta: "View listings",
  },
  {
    key: "shop",
    letter: "C",
    icon: ShoppingBag,
    title: "Cars for sale",
    body: "A curated marketplace of dependable vehicles for buyers who want a straightforward path to ownership.",
    href: "/shop",
    cta: "Browse available cars",
  },
] as const;

const REASONS = [
  {
    icon: ShieldCheck,
    title: "Verified listings only",
    body: "Everything shown is published by us and kept current by our own team.",
  },
  {
    icon: Wallet,
    title: "Transparent pricing",
    body: "Rates and prices are displayed up front. No surprises after you enquire.",
  },
  {
    icon: Headphones,
    title: "One point of contact",
    body: "Rentals, property and shop orders are handled by the same team, end to end.",
  },
  {
    icon: BadgeCheck,
    title: "Reviewed, never automatic",
    body: "Every request is confirmed by a person before anything is locked in.",
  },
];

const METRICS = [
  { value: "50+", label: "fleet units" },
  { value: "120+", label: "properties" },
  { value: "80+", label: "cars for sale" },
  { value: "1 team", label: "one point of contact" },
] as const;

export default async function HomePage() {
  const [settings, vehicles, properties, products] = await Promise.all([
    getSiteSettings(),
    getFeaturedVehicles(3),
    getFeaturedProperties(3),
    getFeaturedProducts(3),
  ]);

  const { brand, hero, about, contact } = settings;
  const wa = whatsappLink(contact.whatsapp, `Hello ${brand.business_name}, I'd like to make an enquiry.`);
  const configured = isSupabaseConfigured();

  return (
    <>
      {/* ═══════════ HERO ═══════════ */}
      <header className="relative flex min-h-screen flex-col overflow-hidden">
        {/* soft background mesh */}
        <div aria-hidden className="absolute inset-0" data-parallax="0.15">
          <div className="absolute inset-0 bg-gradient-to-br from-sage via-cream to-cream" />
          <div className="absolute -left-1/4 top-0 h-[70vh] w-[70vw] rounded-full bg-leaf/10 blur-[120px]" />
          <div className="absolute -right-1/4 bottom-0 h-[60vh] w-[60vw] rounded-full bg-forest/10 blur-[120px]" />
        </div>

        {/* floating translucent forms — ported from design.html */}
        <div aria-hidden className="pointer-events-none absolute inset-0" data-parallax="0.3">
          <div className="animate-drift-a absolute left-[8%] top-[12%] h-40 w-40 rounded-full border border-white/40 bg-gradient-to-br from-white/40 to-white/10 shadow-[inset_0_0_60px_rgba(255,255,255,0.4)] backdrop-blur-sm sm:h-64 sm:w-64" />
          <div className="animate-drift-b absolute right-[10%] top-[28%] h-28 w-28 rounded-[40%] border border-white/30 bg-gradient-to-tl from-leaf/25 to-white/10 shadow-[inset_0_0_40px_rgba(66,168,93,0.3)] backdrop-blur-md sm:h-44 sm:w-44" />
          <div className="animate-drift-c absolute left-[38%] top-[52%] h-20 w-20 rounded-full border border-white/40 bg-gradient-to-b from-white/30 to-transparent backdrop-blur-[2px] sm:h-32 sm:w-32" />
          <div className="animate-drift-b absolute left-[55%] top-[8%] h-14 w-14 rounded-[45%] border border-white/40 bg-white/20 backdrop-blur-sm sm:h-20 sm:w-20" />
          <div className="animate-drift-a absolute bottom-[38%] right-[28%] h-16 w-16 rounded-full border border-white/30 bg-gradient-to-br from-leaf/20 to-transparent backdrop-blur-sm sm:h-24 sm:w-24" />
        </div>

        {/* readability gradient */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-cream via-cream/50 to-transparent" />

        <div className="relative z-10 flex flex-1 items-end">
          <div className="shell w-full pb-[22vw] pt-40 sm:pb-[18vw] lg:pb-[14vw]">
            <div className="max-w-2xl">
              <p data-reveal className="eyebrow mb-8">
                {hero.eyebrow}
              </p>
              <h1
                data-reveal-words
                data-reveal
                className="font-display text-5xl font-light leading-[0.95] tracking-tighter text-ink sm:text-7xl lg:text-8xl"
              >
                {hero.heading}{" "}
                <em className="font-serif font-normal italic">{hero.heading_emphasis}</em>
              </h1>
              {hero.subheading && (
                <p data-reveal className="mt-8 max-w-lg text-sm leading-relaxed text-black/50" style={{ transitionDelay: "550ms" }}>
                  {hero.subheading}
                </p>
              )}
              <div data-reveal className="mt-10 flex flex-wrap items-center gap-6" style={{ transitionDelay: "700ms" }}>
                <Link href={hero.primary_cta_href} className="btn-primary group">
                  {hero.primary_cta_label}
                  <ArrowUpRight
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    strokeWidth={1.5}
                  />
                </Link>
                {wa ? (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-b border-black/20 pb-0.5 text-sm text-black/50 transition-colors duration-300 hover:border-black hover:text-black"
                  >
                    Message us on WhatsApp
                  </a>
                ) : (
                  <Link
                    href="/contact"
                    className="border-b border-black/20 pb-0.5 text-sm text-black/50 transition-colors duration-300 hover:border-black hover:text-black"
                  >
                    Talk to our team
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* giant cropped wordmark */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-[3vw] left-1/2 z-[5] w-full -translate-x-1/2 overflow-hidden"
          data-parallax="0.5"
        >
          <p
            className="wordmark-cropped whitespace-nowrap text-center text-[19vw] font-light text-forest/10"
            style={{ WebkitTextStroke: "1px rgba(30, 77, 51, 0.12)" }}
          >
            {brand.business_name.toUpperCase()}
          </p>
        </div>
      </header>

      {!configured && (
        <section className="shell pb-8">
          <DataModeNotice context="Featured listings on this page come from the database." />
        </section>
      )}

      <section className="relative z-10 -mt-14 pb-20 sm:pb-28">
        <div className="shell">
          <div className="grid gap-4 rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-[0_25px_80px_rgba(18,40,26,0.08)] backdrop-blur-md sm:grid-cols-2 lg:grid-cols-4">
            {METRICS.map((metric, i) => (
              <div key={metric.label} data-reveal style={{ transitionDelay: `${i * 100}ms` }} className="rounded-2xl bg-sage/60 p-5">
                <p className="font-display text-3xl font-light tracking-tighter text-forest">{metric.value}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-black/45">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ THREE BUSINESSES ═══════════ */}
      <section className="bg-sage py-24 text-black sm:py-32">
        <div className="shell">
          <SectionHeading
            eyebrow="What we do"
            title="Three businesses,"
            emphasis="one standard."
            description="Penman Empire operates across vehicle rental, vehicle sales and property. Whichever door you come through, you deal with the same team."
            className="mb-16"
          />
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
            {BUSINESSES.map((business, i) => (
              <Link
                key={business.key}
                href={business.href}
                data-reveal
                style={{ transitionDelay: `${i * 120}ms` }}
                className="group flex flex-col"
              >
                <div className="relative mb-6 grid aspect-[3/2] place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-forest to-forest-light shadow-xl shadow-forest/20">
                  <business.icon
                    className="h-14 w-14 text-white/80 transition-transform duration-700 ease-out group-hover:scale-110"
                    strokeWidth={1}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
                <p className="mb-2 text-xs font-medium text-black/40">{business.letter}</p>
                <h3 className="mb-3 font-display text-xl font-light tracking-tight">{business.title}</h3>
                <p className="flex-1 text-base leading-relaxed text-black/60">{business.body}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-forest">
                  {business.cta}
                  <ArrowUpRight
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    strokeWidth={1.5}
                  />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 sm:py-12">
        <div className="shell">
          <div className="card-surface grid gap-8 overflow-hidden p-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div data-reveal>
              <p className="eyebrow mb-4">A simple way to buy, rent, and enquire</p>
              <h2 className="font-display text-3xl font-light tracking-tighter sm:text-4xl">
                One team. <span className="text-forest">Three services.</span>
              </h2>
            </div>
            <div data-reveal style={{ transitionDelay: "120ms" }} className="flex items-center justify-start lg:justify-end">
              <Link href="/contact" className="btn-primary">
                Talk to the team
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURED VEHICLES ═══════════ */}
      <section className="py-24 sm:py-32">
        <div className="shell">
          <SectionHeading
            eyebrow="Automobile rentals"
            title="Available to"
            emphasis="hire now."
            action={{ href: "/rental", label: "View the full fleet" }}
            className="mb-14"
          />
          {vehicles.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {vehicles.map((vehicle, i) => (
                <div key={vehicle.id} data-reveal style={{ transitionDelay: `${i * 120}ms` }}>
                  <VehicleCard vehicle={vehicle} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No featured vehicles yet"
              description="Mark a vehicle as featured in the admin dashboard and it will appear here automatically."
              action={{ href: "/rental", label: "Browse all vehicles" }}
            />
          )}
        </div>
      </section>

      {/* ═══════════ FEATURED PROPERTIES ═══════════ */}
      <section className="py-24 sm:py-32">
        <div className="shell">
          <SectionHeading
            eyebrow="Real estate"
            title="Featured"
            emphasis="properties."
            action={{ href: "/real-estate", label: "View all listings" }}
            className="mb-14"
          />
          {properties.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((property, i) => (
                <div key={property.id} data-reveal style={{ transitionDelay: `${i * 120}ms` }}>
                  <PropertyCard property={property} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No featured properties yet"
              description="Feature a listing in the admin dashboard to showcase it here."
              action={{ href: "/real-estate", label: "Browse all listings" }}
            />
          )}
        </div>
      </section>

      {/* ═══════════ FEATURED PRODUCTS ═══════════ */}
      <section className="py-24 sm:py-32">
        <div className="shell">
          <SectionHeading
            eyebrow="Online shop"
            title="From the"
            emphasis="catalogue."
            action={{ href: "/shop", label: "Open the shop" }}
            className="mb-14"
          />
          {products.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product, i) => (
                <div key={product.id} data-reveal style={{ transitionDelay: `${i * 120}ms` }}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No featured products yet"
              description="Feature a product in the admin dashboard to display it here."
              action={{ href: "/shop", label: "Browse the catalogue" }}
            />
          )}
        </div>
      </section>

      {/* ═══════════ WHY CHOOSE US ═══════════ */}
      <section className="relative bg-forest py-24 sm:py-32">
        <div className="shell">
          <SectionHeading
            eyebrow="Why Penman Empire"
            title="Deal with people who"
            emphasis="follow through."
            tone="dark"
            className="mb-16"
          />
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {REASONS.map((reason, i) => (
              <div key={reason.title} data-reveal style={{ transitionDelay: `${i * 100}ms` }}>
                <reason.icon className="mb-5 h-7 w-7 text-leaf" strokeWidth={1.25} />
                <h3 className="mb-3 font-display text-lg font-light tracking-tight text-white">{reason.title}</h3>
                <p className="text-sm leading-relaxed text-white/55">{reason.body}</p>
              </div>
            ))}
          </div>

          <div data-reveal className="mt-20 grid gap-10 border-t border-white/10 pt-14 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <h3 className="font-display text-3xl font-light tracking-tighter text-white sm:text-4xl">
                {about.heading}
              </h3>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <p className="text-base leading-relaxed text-white/60">{about.body}</p>
              <Link
                href="/about"
                className="mt-8 inline-flex items-center gap-2 border-b border-white/30 pb-1 text-sm text-white/80 transition-colors hover:border-white hover:text-white"
              >
                More about us
                <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ CLOSING CTA ═══════════ */}
      <section className="relative overflow-hidden pt-12" data-parallax-invert>
        <div aria-hidden className="pointer-events-none select-none overflow-hidden" data-parallax="0.35">
          <p className="wordmark-cropped -mb-[2vw] whitespace-nowrap text-center text-[13vw] font-light text-forest/10">
            LET&apos;S TALK
          </p>
        </div>

        <div className="shell grid grid-cols-1 gap-14 py-20 sm:py-28 lg:grid-cols-12">
          <div className="lg:col-span-5" data-reveal>
            <h2 data-reveal-words className="mb-6 font-display text-4xl font-light leading-[1.05] tracking-tighter sm:text-5xl">
              Ready when
              <br />
              <em className="font-serif font-normal italic">you are.</em>
            </h2>
            <p className="mb-10 max-w-sm text-lg text-black/60">
              Tell us what you need — a vehicle, a property, or a product — and we will come back to you with real
              options.
            </p>
            <div className="flex flex-wrap items-center gap-5">
              <Link href="/contact" className="btn-primary">
                Send an enquiry
              </Link>
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-b border-black/20 pb-1 text-base transition-colors hover:border-forest"
                >
                  WhatsApp us
                </a>
              )}
            </div>
            {contact.phone && (
              <p className="mt-10 text-sm text-black/50">
                Or call{" "}
                <a href={`tel:${contact.phone}`} className="text-forest hover:underline">
                  {contact.phone}
                </a>
                {contact.hours ? ` — ${contact.hours}` : ""}
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
