import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Building2, CarFront, ShoppingBag } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { getSiteSettings } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Penman Empire operates across vehicle rental, car sales and real estate — one brand, one team, one standard of service.",
  alternates: { canonical: "/about" },
};

const PILLARS = [
  {
    icon: CarFront,
    title: "Automobile rentals",
    body: "A maintained fleet available by the day, week or month, with terms explained before you commit.",
    href: "/rental",
  },
  {
    icon: Building2,
    title: "Real estate",
    body: "Residential and commercial property for sale or to let, presented with accurate detail and honest pricing.",
    href: "/real-estate",
  },
  {
    icon: ShoppingBag,
    title: "Cars for sale",
    body: "Verified vehicles available for buyers who want a clear, honest route to ownership without the usual hassle.",
    href: "/shop",
  },
];

const PRINCIPLES = [
  {
    title: "Accuracy over volume",
    body: "We would rather publish fewer listings that are correct than a long list that misleads.",
  },
  {
    title: "Human confirmation",
    body: "No automated promises. Every rental, viewing or order is confirmed by a person.",
  },
  {
    title: "One point of contact",
    body: "The same team handles rental, purchase and property enquiries — so nothing gets lost between them.",
  },
  {
    title: "Clear pricing",
    body: "Where a price exists, we show it. Where it does not, we say so plainly rather than inventing a number.",
  },
];

export default async function AboutPage() {
  const settings = await getSiteSettings();
  const { about, brand } = settings;

  return (
    <>
      <PageHeader
        eyebrow={`About ${brand.business_name}`}
        title="One brand,"
        emphasis="three businesses."
        description={about.body}
      />

      <section className="shell pb-24 sm:pb-32">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PILLARS.map((pillar, i) => (
            <Link
              key={pillar.title}
              href={pillar.href}
              data-reveal
              style={{ transitionDelay: `${i * 110}ms` }}
              className="group card-surface flex flex-col p-7 transition-shadow duration-500 hover:shadow-xl hover:shadow-black/10"
            >
              <pillar.icon className="mb-6 h-8 w-8 text-forest" strokeWidth={1.25} />
              <h2 className="font-display text-xl font-light tracking-tight">{pillar.title}</h2>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-black/60">{pillar.body}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-forest">
                Explore
                <ArrowUpRight
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  strokeWidth={1.5}
                />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-sage py-24 sm:py-32">
        <div className="shell">
          <SectionHeading eyebrow="How we work" title="The principles we" emphasis="hold to." className="mb-16" />
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
            {PRINCIPLES.map((principle, i) => (
              <div
                key={principle.title}
                data-reveal
                style={{ transitionDelay: `${i * 100}ms` }}
                className="border-t border-black/10 pt-8"
              >
                <h3 className="font-display text-xl font-light tracking-tight">{principle.title}</h3>
                <p className="mt-3 max-w-md text-base leading-relaxed text-black/60">{principle.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="shell py-24 sm:py-32">
        <div className="card-surface flex flex-col items-start gap-6 p-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-3xl font-light tracking-tighter">Ready to work with us?</h2>
            <p className="mt-3 max-w-md text-base text-black/60">
              Send an enquiry and we will come back to you with real options.
            </p>
          </div>
          <Link href="/contact" className="btn-primary shrink-0">
            Contact us
          </Link>
        </div>
      </section>
    </>
  );
}
