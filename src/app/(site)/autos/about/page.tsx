import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Building2, CarFront, ShoppingBag } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { getSiteSettings } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Autos",
  description: "Learn how Penman Empire supports vehicle buyers and drivers through the autos division.",
  alternates: { canonical: "/autos/about" },
};

const PILLARS = [
  { icon: CarFront, title: "Vehicle hire", body: "Flexible rental arrangements for business travel, family trip planning and daily mobility.", href: "/rental" },
  { icon: ShoppingBag, title: "Cars for sale", body: "A clear route to buying a vehicle without the guesswork that often comes with marketplace browsing.", href: "/shop" },
  { icon: Building2, title: "Broader Penman Empire", body: "The same team also supports property and commercial enquiries when your needs extend beyond vehicles.", href: "/about" },
] as const;

export default async function AutosAboutPage() {
  const settings = await getSiteSettings();
  const { brand } = settings;

  return (
    <>
      <PageHeader
        eyebrow={`About ${brand.business_name} Autos`}
        title="Vehicle support that"
        emphasis="feels personal."
        description="The autos division brings together vehicle sales and vehicle hire with clear guidance, direct communication and practical decision-making."
      />

      <section className="shell pb-24 sm:pb-32">
        <div className="grid gap-6 md:grid-cols-3">
          {PILLARS.map((pillar, index) => (
            <Link key={pillar.title} href={pillar.href} data-reveal style={{ transitionDelay: `${index * 110}ms` }} className="group card-surface flex flex-col p-7 transition-shadow duration-500 hover:shadow-xl hover:shadow-black/10">
              <pillar.icon className="mb-6 h-8 w-8 text-forest" strokeWidth={1.25} />
              <h2 className="font-display text-xl font-light tracking-tight">{pillar.title}</h2>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-black/60">{pillar.body}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-forest">
                Explore
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.5} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-sage py-24 sm:py-32">
        <div className="shell">
          <SectionHeading eyebrow="Our approach" title="Clear, honest, and" emphasis="human." className="mb-14" />
          <div className="grid gap-10 md:grid-cols-3">
            <div className="border-t border-black/10 pt-6">
              <h3 className="font-display text-xl font-light tracking-tight">Straightforward choices</h3>
              <p className="mt-3 text-base leading-relaxed text-black/60">We present what matters most so buyers and drivers can compare options cleanly.</p>
            </div>
            <div className="border-t border-black/10 pt-6">
              <h3 className="font-display text-xl font-light tracking-tight">Real confirmation</h3>
              <p className="mt-3 text-base leading-relaxed text-black/60">Every request is reviewed by a person before a deal or booking is treated as final.</p>
            </div>
            <div className="border-t border-black/10 pt-6">
              <h3 className="font-display text-xl font-light tracking-tight">Prepared support</h3>
              <p className="mt-3 text-base leading-relaxed text-black/60">We help with route planning, vehicle selection and practical next steps for each enquiry.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
