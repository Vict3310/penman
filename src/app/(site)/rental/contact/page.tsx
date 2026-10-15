import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { submitRentalEnquiry } from "@/app/actions/public";
import { EnquiryForm, type EnquiryField } from "@/components/enquiry-form";
import { PageHeader } from "@/components/page-header";
import { getSiteSettings } from "@/lib/site";
import { whatsappLink } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Rental Contact",
  description: "Ask about vehicle availability, rental dates or a general vehicle enquiry with Penman Empire.",
  alternates: { canonical: "/rental/contact" },
};

const FIELDS: EnquiryField[] = [
  { name: "name", label: "Your name", type: "text", required: true, half: true, placeholder: "Full name" },
  { name: "phone", label: "Phone number", type: "tel", required: true, half: true, placeholder: "+234…" },
  { name: "email", label: "Email (optional)", type: "email", half: true, placeholder: "you@example.com" },
  { name: "pickup_date", label: "Pickup date", type: "date", required: true, half: true },
  { name: "return_date", label: "Return date", type: "date", required: true, half: true },
  { name: "message", label: "Tell us what you need", type: "textarea", rows: 4, placeholder: "Vehicle type, route or pickup point…" },
];

export default async function RentalContactPage() {
  const settings = await getSiteSettings();
  const wa = whatsappLink(settings.contact.whatsapp, `Hello ${settings.brand.business_name}, I'd like to enquire about a rental.`);

  return (
    <>
      <PageHeader
        eyebrow="Rental contact"
        title="Talk to the"
        emphasis="rental team."
        description="Share your preferred dates and travel needs and we will confirm the vehicle and next step."
      />

      <section className="shell pb-24 sm:pb-32">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="card-surface p-8">
            <h2 className="font-display text-3xl font-light tracking-tight">Rental support</h2>
            <div className="mt-6 space-y-4 text-sm text-black/60">
              {settings.contact.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 text-forest" strokeWidth={1.5} />
                  <a href={`tel:${settings.contact.phone}`} className="hover:text-ink">{settings.contact.phone}</a>
                </div>
              )}
              {settings.contact.email && (
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 text-forest" strokeWidth={1.5} />
                  <a href={`mailto:${settings.contact.email}`} className="hover:text-ink">{settings.contact.email}</a>
                </div>
              )}
              {settings.contact.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-forest" strokeWidth={1.5} />
                  <span>{settings.contact.address}</span>
                </div>
              )}
            </div>
            {wa && (
              <Link href={wa} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center rounded-full bg-forest px-5 py-3 text-sm font-medium text-white">
                Chat on WhatsApp
              </Link>
            )}
          </aside>

          <div className="card-surface p-8">
            <EnquiryForm
              action={submitRentalEnquiry}
              fields={FIELDS}
              submitLabel="Send rental enquiry"
              whatsappHref={wa}
            />
          </div>
        </div>
      </section>
    </>
  );
}
