import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck2, CarFront, CheckCircle2, PhoneCall } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "How Rental Works",
  description: "Learn how to book a rental vehicle, confirm dates and complete your enquiry with Penman Empire.",
  alternates: { canonical: "/rental/how-it-works" },
};

const steps = [
  { icon: CarFront, title: "Choose your vehicle", body: "Browse the fleet and select a vehicle that matches your route, group size and budget." },
  { icon: CalendarCheck2, title: "Pick your dates", body: "Share your pickup and return dates, preferred location and any requirements you need us to note." },
  { icon: CheckCircle2, title: "We confirm availability", body: "Our team reviews the request and confirms the booking details before anything is finalised." },
  { icon: PhoneCall, title: "Collect and drive", body: "Once approved, we arrange the pickup information and handover details with you directly." },
] as const;

export default function RentalHowItWorksPage() {
  return (
    <>
      <PageHeader
        eyebrow="Rental process"
        title="Simple steps"
        emphasis="clear support."
        description="Every request is handled directly by our team so you know what to expect before you commit."
      />

      <section className="shell pb-24 sm:pb-32">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className="card-surface p-6">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-sage text-forest">
                <step.icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <p className="mt-5 text-xs font-medium uppercase tracking-[0.2em] text-black/40">0{index + 1}</p>
              <h2 className="mt-3 font-display text-2xl font-light tracking-tight">{step.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-black/60">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="card-surface p-8">
            <h2 className="font-display text-2xl font-light tracking-tight">What to prepare before you enquire</h2>
            <ul className="mt-6 space-y-4 text-sm leading-relaxed text-black/60">
              <li className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest" /> Preferred pickup and return dates.</li>
              <li className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest" /> Driver and passenger details, where relevant.</li>
              <li className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest" /> Any route requirements or preferred pickup location.</li>
              <li className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest" /> A clear understanding of the rental duration and included terms.</li>
            </ul>
          </div>

          <div className="card-surface p-8">
            <h2 className="font-display text-2xl font-light tracking-tight">Need help fast?</h2>
            <p className="mt-3 text-sm leading-relaxed text-black/60">
              Tell us what you need, and our team will confirm availability and the next step. Nothing is confirmed until we review your request with you.
            </p>
            <Link href="/rental/contact" className="mt-6 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-3 text-sm font-medium text-white">
              Contact the rental desk <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
