import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Autos FAQs",
  description: "Frequently asked questions about buying a car, arranging a rental, and speaking with the Penman Empire autos team.",
  alternates: { canonical: "/autos/faq" },
};

const faqs = [
  { question: "Can I ask about a specific vehicle or rental option?", answer: "Yes. Every listing page includes an enquiry form so you can ask about pricing, availability, condition and timing directly." },
  { question: "Does an enquiry reserve a car?", answer: "No. We review each enquiry and confirm the next step with you before anything is finalised." },
  { question: "Do you support both purchase and rental enquiries?", answer: "Yes. The autos division covers both sales and hire arrangements, and we can guide you to the right path depending on your need." },
  { question: "What details should I share?", answer: "Preferred vehicle type, budget, timing and any route or usage requirements make it much easier for us to narrow the right option." },
] as const;

export default function AutosFaqPage() {
  return (
    <>
      <PageHeader
        eyebrow="Autos FAQs"
        title="Answers to the"
        emphasis="questions we hear most."
        description="A quick guide to the most common enquiries from buyers and drivers who are looking for the next vehicle decision."
      />

      <section className="shell pb-24 sm:pb-32">
        <div className="mx-auto max-w-3xl space-y-4">
          {faqs.map((faq) => (
            <details key={faq.question} className="group rounded-2xl border border-black/10 bg-white/80 p-5 shadow-sm">
              <summary className="cursor-pointer list-none font-display text-xl font-light tracking-tight text-ink">
                {faq.question}
              </summary>
              <p className="mt-4 text-sm leading-relaxed text-black/60">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
