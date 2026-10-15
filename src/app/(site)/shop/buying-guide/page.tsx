import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CarFront, CheckCircle2, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Car Buying Guide",
  description: "Learn how to choose the right vehicle, compare your options and enquire with confidence.",
  alternates: { canonical: "/shop/buying-guide" },
};

const steps = [
  { icon: Search, title: "Set your shortlist", body: "Filter by body type, price range and key preferences to narrow down the vehicles that fit your needs." },
  { icon: CarFront, title: "Compare the right fit", body: "Review the condition, mileage, transmission and available details before sizing up your options." },
  { icon: BadgeCheck, title: "Enquire with confidence", body: "Send a purchase enquiry and our team will confirm the vehicle, pricing and next steps directly." },
] as const;

export default function ShopBuyingGuidePage() {
  return (
    <>
      <PageHeader
        eyebrow="Buying guide"
        title="How to buy with"
        emphasis="confidence."
        description="A clear buying process keeps the decision simple, transparent and centred on the vehicle that matches your needs."
      />

      <section className="shell pb-24 sm:pb-32">
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.title} className="card-surface p-6">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-sage text-forest">
                <step.icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <h2 className="mt-5 font-display text-2xl font-light tracking-tight">{step.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-black/60">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 card-surface p-8">
          <h2 className="font-display text-2xl font-light tracking-tight">What to check before you enquire</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            <li className="flex gap-3 text-sm text-black/60"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest" /> Budget and preferred price range.</li>
            <li className="flex gap-3 text-sm text-black/60"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest" /> Fuel type or transmission preference.</li>
            <li className="flex gap-3 text-sm text-black/60"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest" /> Desired size, use case and mileage expectation.</li>
            <li className="flex gap-3 text-sm text-black/60"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest" /> Delivery or collection arrangements.</li>
          </ul>
          <Link href="/shop" className="mt-8 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-3 text-sm font-medium text-white">
            Explore cars for sale <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </div>
      </section>
    </>
  );
}
