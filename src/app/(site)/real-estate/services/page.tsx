import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, House, MapPinned, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Real Estate Services",
  description: "Explore the property services available through Penman Empire, from sales to lettings and advisory guidance.",
  alternates: { canonical: "/real-estate/services" },
};

const services = [
  { icon: House, title: "Property sales", body: "Browse homes, plots and commercial spaces with clear price and availability information." },
  { icon: Building2, title: "Rental listings", body: "Review available properties for lettings and tenancy enquiries with straightforward communication." },
  { icon: MapPinned, title: "Local guidance", body: "We help narrow options by location, property type and the practical needs that matter to you." },
  { icon: ShieldCheck, title: "Trusted process", body: "Every enquiry is reviewed by our team so the next step is clear and personal." },
] as const;

export default function RealEstateServicesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Property services"
        title="Find the right"
        emphasis="property path."
        description="Whether you are buying, renting or exploring the market, we help you move with clarity and practical support."
      />

      <section className="shell pb-24 sm:pb-32">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {services.map((service) => (
            <div key={service.title} className="card-surface p-6">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-sage text-forest">
                <service.icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <h2 className="mt-5 font-display text-2xl font-light tracking-tight">{service.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-black/60">{service.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 card-surface p-8">
          <h2 className="font-display text-2xl font-light tracking-tight">What to share when you enquire</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            <li className="flex gap-3 text-sm text-black/60"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest" /> Property type or preferred location.</li>
            <li className="flex gap-3 text-sm text-black/60"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest" /> Budget and purchase or rental intent.</li>
            <li className="flex gap-3 text-sm text-black/60"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest" /> Bedrooms, area and features that matter most.</li>
            <li className="flex gap-3 text-sm text-black/60"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest" /> Timing for viewing, purchase or move-in.</li>
          </ul>
          <Link href="/real-estate" className="mt-8 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-3 text-sm font-medium text-white">
            Explore properties <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </div>
      </section>
    </>
  );
}
