import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, CarFront, Headphones, ShieldCheck } from "lucide-react";
import { Figure, ProductCard } from "@/components/cards";
import { DataModeNotice } from "@/components/data-mode-notice";
import { SectionHeading } from "@/components/section-heading";
import { getFeaturedProducts } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site";
import { isSupabaseConfigured } from "@/lib/env";
import { whatsappLink } from "@/lib/utils";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Cars for Sale",
  description: "Find quality vehicles for sale with clear pricing, a straightforward buying process and direct team support.",
  alternates: { canonical: "/shop" },
};

const reasons = [
  { icon: ShieldCheck, title: "Verified vehicles", body: "We present vehicles with the information buyers actually need before they enquire." },
  { icon: CarFront, title: "Simple pricing", body: "Ask about the details that matter most to you and get a direct answer from our team." },
  { icon: Headphones, title: "Direct support", body: "Our team helps compare the right option and confirm the next step without confusion." },
] as const;

export default async function ShopHomePage() {
  const [featuredProducts, settings] = await Promise.all([getFeaturedProducts(3), getSiteSettings()]);
  const { brand, contact } = settings;
  const wa = whatsappLink(contact.whatsapp, `Hello ${brand.business_name}, I'd like to enquire about buying a vehicle.`);
  const configured = isSupabaseConfigured();

  const heroProduct = featuredProducts[0];

  return (
    <>
      <section className="shell pb-12 pt-32 sm:pb-16 sm:pt-40">
        <div className="overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-[0_24px_80px_rgba(17,24,39,0.08)]">
          <div className="grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-14">
              <p className="eyebrow mb-5">Cars for sale</p>
              <h1 className="max-w-xl font-display text-4xl font-light leading-[0.95] tracking-tighter text-ink sm:text-5xl lg:text-6xl">
                Your next car
                <span className="font-serif italic text-forest"> starts here.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-black/65 sm:text-lg">
                Discover vehicles that fit your day-to-day needs and enquire with a team that helps you compare the right option with confidence.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/shop/cars" className="btn-primary group">
                  Browse cars for sale
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.5} />
                </Link>
                <Link href="/shop/contact" className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-medium text-black/70 transition-colors hover:border-black hover:text-black">
                  Get in touch
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-black/60">
                <span className="inline-flex items-center gap-2 rounded-full bg-sage px-3 py-1.5 text-forest">
                  <CarFront className="h-4 w-4" strokeWidth={1.5} />
                  Current stock
                </span>
                <span>Clear options and direct support</span>
              </div>
            </div>

            <div className="relative min-h-[360px] bg-sage/50 lg:min-h-[520px]">
              {heroProduct ? (
                <>
                  <Figure images={heroProduct.images} alt={heroProduct.name} className="h-full min-h-[360px] lg:min-h-[520px]" sizes="(max-width: 1024px) 100vw, 52vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                    <div className="max-w-sm rounded-2xl border border-white/20 bg-white/12 p-4 text-white backdrop-blur-sm">
                      <p className="text-xs uppercase tracking-[0.25em] text-white/70">Featured vehicle</p>
                      <div className="mt-2 flex items-end justify-between gap-4">
                        <div>
                          <h2 className="font-display text-2xl font-light tracking-tight">{heroProduct.name}</h2>
                          <p className="mt-1 text-sm text-white/80">{heroProduct.category?.name ?? "Vehicle"}</p>
                        </div>
                        <Link href={`/shop/${heroProduct.slug}`} className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/25">
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid h-full place-items-center bg-gradient-to-br from-sage to-cream p-8 text-center">
                  <div>
                    <p className="eyebrow mb-3">Premium sales</p>
                    <h2 className="font-display text-3xl font-light tracking-tight text-ink">A simpler way to find your next vehicle.</h2>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="shell pb-12 sm:pb-16">
        <div className="grid gap-6 lg:grid-cols-3">
          <Link href="/shop/cars" className="card-surface flex h-full flex-col p-7 transition-shadow hover:shadow-xl hover:shadow-black/10">
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-full bg-sage text-forest">
              <CarFront className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <h2 className="font-display text-2xl font-light tracking-tight">Browse inventory</h2>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-black/60">See the current selection and narrow by category, budget and preferred vehicle type.</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-forest">Explore <ArrowRight className="h-4 w-4" strokeWidth={1.5} /></span>
          </Link>

          <Link href="/shop/buying-guide" className="card-surface flex h-full flex-col p-7 transition-shadow hover:shadow-xl hover:shadow-black/10">
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-full bg-sage text-forest">
              <BadgeCheck className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <h2 className="font-display text-2xl font-light tracking-tight">Buying guide</h2>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-black/60">Understand how to short-list and compare the best fit before you make an enquiry.</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-forest">Read the guide <ArrowRight className="h-4 w-4" strokeWidth={1.5} /></span>
          </Link>

          <Link href="/shop/contact" className="card-surface flex h-full flex-col p-7 transition-shadow hover:shadow-xl hover:shadow-black/10">
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-full bg-sage text-forest">
              <Headphones className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <h2 className="font-display text-2xl font-light tracking-tight">Speak to the team</h2>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-black/60">Tell us what you are looking for and we will guide you to the correct options and next steps.</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-forest">Contact us <ArrowRight className="h-4 w-4" strokeWidth={1.5} /></span>
          </Link>
        </div>
      </section>

      {!configured && (
        <section className="shell pb-8">
          <DataModeNotice context="Featured cars are read from your database." />
        </section>
      )}

      <section className="bg-sage py-24 sm:py-28">
        <div className="shell">
          <SectionHeading
            eyebrow="Why buyers choose us"
            title="Clear choices,"
            emphasis="better decisions."
            description="We keep the buying process transparent so it feels straightforward, honest and easy to understand."
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
          eyebrow="Featured stock"
          title="Popular buyers"
          emphasis="shortlists."
          action={{ href: "/shop/cars", label: "Browse all cars" }}
          description="Browse a few current favourites to help you decide where to start."
          className="mb-12"
        />

        {featuredProducts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {featuredProducts.map((product, index) => (
              <div key={product.id} data-reveal style={{ transitionDelay: `${index * 100}ms` }}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card-surface p-8 text-sm text-black/60">
            No featured vehicles are available right now. Check the full catalogue or ask the team for current recommendations.
          </div>
        )}
      </section>

      <section className="pb-24 sm:pb-32">
        <div className="shell">
          <div className="card-surface p-8 sm:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="eyebrow mb-4">Need a personalised recommendation?</p>
                <h2 className="font-display text-4xl font-light tracking-tighter sm:text-5xl">
                  Tell us what you want,
                  <span className="font-serif italic"> we’ll help narrow it down.</span>
                </h2>
              </div>
              <div className="flex flex-wrap gap-4">
                <Link href="/shop/contact" className="btn-primary group">
                  Contact the sales team
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
