import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { getSiteSettings } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms that apply to enquiries, rentals, property listings and shop orders with Penman Empire.",
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
  const settings = await getSiteSettings();
  const { brand, contact } = settings;

  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Terms &"
        emphasis="conditions."
        description="The basis on which we accept enquiries through this website."
      />

      <section className="shell pb-24 sm:pb-32">
        <div className="card-surface max-w-3xl space-y-8 p-8 sm:p-10">
          <div>
            <h2 className="font-display text-xl font-light tracking-tight">Enquiries are not bookings</h2>
            <p className="mt-3 text-base leading-relaxed text-black/60">
              Submitting a form on this website — for a vehicle rental, a property viewing or a product order — sends
              an enquiry to our team. It does not create a reservation, a contract or a confirmed order. Nothing is
              held for you until a member of our team confirms it with you directly.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-light tracking-tight">Vehicle rentals</h2>
            <p className="mt-3 text-base leading-relaxed text-black/60">
              Availability shown on this website is indicative and may change. Rental rates, deposits, mileage limits
              and eligibility requirements are confirmed before any hire begins, and the terms stated on the
              individual vehicle page apply.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-light tracking-tight">Property listings</h2>
            <p className="mt-3 text-base leading-relaxed text-black/60">
              Property information is published in good faith but may change without notice. Prices marked
              &ldquo;on request&rdquo; indicate that no public price has been set. Nothing on this website constitutes
              an offer capable of acceptance, and listings may be withdrawn at any time.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-light tracking-tight">Shop orders</h2>
            <p className="mt-3 text-base leading-relaxed text-black/60">
              Placing an order enquiry does not charge you. We confirm stock, final price and delivery arrangements
              with you before completing any sale. Product photography is illustrative; actual items may vary
              slightly.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-light tracking-tight">Acceptable use</h2>
            <p className="mt-3 text-base leading-relaxed text-black/60">
              You agree not to submit false, misleading or abusive enquiries, and not to attempt to gain unauthorised
              access to any part of this website or its data.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-light tracking-tight">Contact</h2>
            <p className="mt-3 text-base leading-relaxed text-black/60">
              Questions about these terms can be sent to{" "}
              {contact.email ? (
                <a href={`mailto:${contact.email}`} className="text-forest hover:underline">
                  {contact.email}
                </a>
              ) : (
                brand.business_name
              )}
              .
            </p>
          </div>

          <p className="border-t border-black/10 pt-6 text-xs text-black/40">
            These terms are provided as a plain-language baseline. The business owner should have them reviewed to
            confirm they satisfy all applicable local requirements before relying on them.
          </p>
        </div>
      </section>
    </>
  );
}
