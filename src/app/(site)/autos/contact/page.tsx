import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { submitContactMessage } from "@/app/actions/public";
import { EnquiryForm, type EnquiryField } from "@/components/enquiry-form";
import { PageHeader } from "@/components/page-header";
import { getSiteSettings } from "@/lib/site";
import { whatsappLink } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Autos Contact",
  description: "Get in touch with the Penman Empire autos team about buying or hiring a vehicle.",
  alternates: { canonical: "/autos/contact" },
};

const FIELDS: EnquiryField[] = [
  { name: "name", label: "Your name", type: "text", required: true, half: true, placeholder: "Full name" },
  { name: "phone", label: "Phone number", type: "tel", required: true, half: true, placeholder: "+234…" },
  { name: "email", label: "Email (optional)", type: "email", half: true, placeholder: "you@example.com" },
  { name: "subject", label: "Subject", type: "text", required: true, half: true, placeholder: "Vehicle purchase or rental" },
  { name: "message", label: "How can we help?", type: "textarea", required: true, rows: 5, placeholder: "Tell us what vehicle type, timing or budget you have in mind" },
];

export default async function AutosContactPage() {
  const settings = await getSiteSettings();
  const { contact, brand } = settings;

  const wa = whatsappLink(contact.whatsapp, `Hello ${brand.business_name}, I'd like to enquire about a vehicle.`);

  const details = [
    contact.phone ? { icon: Phone, label: "Phone", value: contact.phone, href: `tel:${contact.phone}` } : null,
    contact.email ? { icon: Mail, label: "Email", value: contact.email, href: `mailto:${contact.email}` } : null,
    contact.whatsapp ? { icon: MessageCircle, label: "WhatsApp", value: contact.whatsapp, href: wa ?? undefined } : null,
    contact.address ? { icon: MapPin, label: "Address", value: contact.address, href: undefined } : null,
    contact.hours ? { icon: Clock, label: "Opening hours", value: contact.hours, href: undefined } : null,
  ].filter(Boolean) as { icon: typeof Phone; label: string; value: string; href?: string }[];

  return (
    <>
      <PageHeader
        eyebrow="Autos contact"
        title="Let's talk about"
        emphasis="your next vehicle."
        description="Whether you are buying, renting or comparing options, tell us the details and we will respond with the right next step."
      />

      <section className="shell grid grid-cols-1 gap-14 pb-24 sm:pb-32 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 className="font-display text-2xl font-light tracking-tight">Reach the autos team</h2>
          <ul className="mt-8 space-y-6">
            {details.map((detail) => (
              <li key={detail.label} className="flex items-start gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sage text-forest">
                  <detail.icon className="h-4 w-4" strokeWidth={1.5} />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-widest text-black/40">{detail.label}</p>
                  {detail.href ? (
                    <a href={detail.href} target={detail.href.startsWith("http") ? "_blank" : undefined} rel={detail.href.startsWith("http") ? "noopener noreferrer" : undefined} className="mt-1 block text-base text-ink transition-colors hover:text-forest">
                      {detail.value}
                    </a>
                  ) : (
                    <p className="mt-1 text-base text-ink">{detail.value}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <div className="card-surface p-7 sm:p-9">
            <h2 className="font-display text-2xl font-light tracking-tight">Send an enquiry</h2>
            <p className="mt-2 text-sm text-black/50">We read every message and reply during business hours.</p>
            <div className="mt-8">
              <EnquiryForm action={submitContactMessage} fields={FIELDS} submitLabel="Send message" whatsappHref={wa} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
