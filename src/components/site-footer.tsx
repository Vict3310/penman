import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { LogoMark } from "@/components/logo";
import type { SiteSettings } from "@/lib/site";
import { whatsappLink } from "@/lib/utils";

const SECTIONS = [
  {
    title: "Automobiles",
    links: [
      { href: "/rental", label: "Rental catalogue" },
      { href: "/rental?availability=available", label: "Available now" },
    ],
  },
  {
    title: "Real Estate",
    links: [
      { href: "/real-estate", label: "All listings" },
      { href: "/real-estate?listing_type=sale", label: "For sale" },
      { href: "/real-estate?listing_type=rent", label: "To let" },
    ],
  },
  {
    title: "Cars for Sale",
    links: [
      { href: "/shop", label: "Vehicle marketplace" },
      { href: "/contact", label: "Buy a car" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const { brand, contact, social, footer } = settings;
  const year = new Date().getFullYear();

  const socials = [
    { label: "Instagram", href: social.instagram },
    { label: "Facebook", href: social.facebook },
    { label: "X", href: social.x },
    { label: "LinkedIn", href: social.linkedin ?? "" },
  ].filter((s) => s.href);

  const wa = whatsappLink(contact.whatsapp, `Hello ${brand.business_name}, I'd like to make an enquiry.`);

  return (
    <footer className="border-t border-black/10 bg-cream">
      <div className="shell py-16">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2.5">
              <LogoMark />
              <span className="font-display text-sm font-semibold tracking-tight">{brand.business_name}</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-black/50">{brand.tagline}</p>

            <ul className="mt-6 space-y-3 text-sm">
              {contact.phone && (
                <li className="flex items-start gap-2.5 text-black/60">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-forest" strokeWidth={1.5} />
                  <a href={`tel:${contact.phone}`} className="hover:text-ink">
                    {contact.phone}
                  </a>
                </li>
              )}
              {contact.email && (
                <li className="flex items-start gap-2.5 text-black/60">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-forest" strokeWidth={1.5} />
                  <a href={`mailto:${contact.email}`} className="hover:text-ink">
                    {contact.email}
                  </a>
                </li>
              )}
              {contact.address && (
                <li className="flex items-start gap-2.5 text-black/60">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-forest" strokeWidth={1.5} />
                  <span>{contact.address}</span>
                </li>
              )}
            </ul>

            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-forest/25 transition-all hover:bg-forest-light active:scale-95"
              >
                Chat on WhatsApp
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <h3 className="font-display text-sm font-semibold tracking-tight">{section.title}</h3>
                <ul className="mt-4 space-y-2.5 text-sm text-black/50">
                  {section.links.map((link) => (
                    <li key={`${section.title}-${link.href}-${link.label}`}>
                      <Link href={link.href} className="transition-colors hover:text-ink">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-black/10 pt-8 text-xs text-black/40 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {brand.business_name}. All rights reserved.
          </p>
          {footer.note && <p className="max-w-xl">{footer.note}</p>}
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-ink"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
