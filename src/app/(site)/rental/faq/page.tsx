import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Rental FAQs",
  description: "Common questions about corporate and personal vehicle rental with Penman Empire.",
  alternates: { canonical: "/rental/faq" },
};

const faqs = [
  { question: "Does sending a rental enquiry reserve the car?", answer: "No. Submitting an enquiry is the first step. Our team checks availability and confirms the booking details with you before anything is confirmed." },
  { question: "Can I request a vehicle for a specific date range?", answer: "Yes. The enquiry form includes your preferred pickup date and return date so we can match you with the right vehicle and confirm the availability window." },
  { question: "Do you offer vehicles for business or family use?", answer: "We list vehicles across different categories, so the fleet can suit business travel, private hire, and group transportation depending on availability." },
  { question: "What information should I include in my enquiry?", answer: "Include your name, phone number, preferred dates, pickup location, and any notes about your route or passenger needs so we can advise you accurately." },
  { question: "Can I enquire about a specific vehicle?", answer: "Yes. Each listing page includes a rental enquiry form, and we can also help if you would like a recommendation based on your requirements." },
] as const;

export default function RentalFaqPage() {
  return (
    <>
      <PageHeader
        eyebrow="Rental FAQs"
        title="Answers to the"
        emphasis="questions we hear most."
        description="If you need a vehicle for a few days or a longer arrangement, these are the most common questions we receive."
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
