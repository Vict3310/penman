import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Real Estate FAQs",
  description: "Common property questions about buying, renting and arranging a viewing with Penman Empire.",
  alternates: { canonical: "/real-estate/faq" },
};

const faqs = [
  { question: "Can I enquire about a property without committing to a viewing?", answer: "Yes. Our form lets you send your interest, preferred budget and any questions before a viewing or next step is arranged." },
  { question: "Do the listings show sale and rental properties together?", answer: "Yes. The property catalogue includes both sale and rental listings so you can filter based on the type of opportunity you are looking for." },
  { question: "How do I ask for a viewing?", answer: "Use the enquiry form on the individual property page and include your preferred timing or any questions about the listing." },
  { question: "What if my requirements are not listed yet?", answer: "You can contact the property team directly and share the type of property, location and budget so they can guide you to suitable options." },
] as const;

export default function RealEstateFaqPage() {
  return (
    <>
      <PageHeader
        eyebrow="Property FAQs"
        title="Helpful answers for"
        emphasis="buyers and tenants."
        description="Questions from first-time views to more specific property searches are reviewed by the team and answered clearly."
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
