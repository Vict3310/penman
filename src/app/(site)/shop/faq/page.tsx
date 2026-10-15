import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Cars for Sale FAQs",
  description: "Common questions about browsing and enquiring about vehicles in our sales marketplace.",
  alternates: { canonical: "/shop/faq" },
};

const faqs = [
  { question: "Does a purchase enquiry reserve a vehicle?", answer: "No. We review each purchase enquiry and confirm the next step before booking or arranging a transfer." },
  { question: "Can I ask about a specific car?", answer: "Yes. Every listing page includes an enquiry form so you can ask about the condition, price and delivery arrangements for a specific vehicle." },
  { question: "Do you list vehicles by condition or mileage?", answer: "The marketplace highlights the information we have available for each listing, including mileage, condition and general specifications where they are provided." },
  { question: "Can I request a vehicle that is not currently listed?", answer: "You can contact the team directly and tell us what you are looking for. We may still be able to suggest similar options from our stock or upcoming availability." },
] as const;

export default function ShopFaqPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sales FAQs"
        title="Frequently asked"
        emphasis="questions."
        description="Everything you need to know before asking about a vehicle or placing an enquiry."
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
