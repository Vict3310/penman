import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bath, BedDouble, Check, MapPin, Ruler } from "lucide-react";
import { submitPropertyEnquiry } from "@/app/actions/public";
import { EnquiryForm, type EnquiryField } from "@/components/enquiry-form";
import { Gallery } from "@/components/gallery";
import { Badge, StatusBadge } from "@/components/ui/misc";
import { getPropertyBySlug } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site";
import { formatCurrency, whatsappLink } from "@/lib/utils";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) return { title: "Property not found" };

  const title = property.seo_title || property.title;
  const description =
    property.seo_description ||
    property.description?.slice(0, 155) ||
    `${property.title} in ${property.location} — available through Penman Empire.`;

  return {
    title,
    description,
    alternates: { canonical: `/real-estate/${property.slug}` },
    openGraph: {
      title,
      description,
      images: property.images?.[0]?.url ? [{ url: property.images[0].url }] : undefined,
    },
  };
}

const FIELDS: EnquiryField[] = [
  { name: "name", label: "Your name", type: "text", required: true, half: true, placeholder: "Full name" },
  { name: "phone", label: "Phone number", type: "tel", required: true, half: true, placeholder: "+234…" },
  { name: "email", label: "Email (optional)", type: "email", half: true, placeholder: "you@example.com" },
  { name: "message", label: "Your message", type: "textarea", rows: 4, placeholder: "I'd like to arrange a viewing…" },
];

export default async function PropertyDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) notFound();

  const settings = await getSiteSettings();

  const priceLabel =
    property.price_type === "on_request" || property.price === null
      ? "Price on request"
      : `${formatCurrency(property.price, property.currency)}${property.listing_type === "rent" ? " / year" : ""}`;

  const facts = [
    property.bedrooms !== null ? { icon: BedDouble, label: "Bedrooms", value: String(property.bedrooms) } : null,
    property.bathrooms !== null ? { icon: Bath, label: "Bathrooms", value: String(property.bathrooms) } : null,
    property.area_sqm !== null ? { icon: Ruler, label: "Area", value: `${property.area_sqm} m²` } : null,
  ].filter(Boolean) as { icon: typeof BedDouble; label: string; value: string }[];

  const wa = whatsappLink(
    settings.contact.whatsapp,
    `Hello ${settings.brand.business_name}, I'd like to enquire about the property: ${property.title}.`,
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Residence",
    name: property.title,
    description: property.description ?? undefined,
    address: property.address ?? property.location,
    image: property.images?.map((i) => i.url),
    numberOfRooms: property.bedrooms ?? undefined,
  };

  return (
    <article className="pb-24 pt-36 sm:pb-32 sm:pt-44">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="shell">
        <Link
          href="/real-estate"
          className="mb-10 inline-flex items-center gap-2 text-sm text-black/50 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          Back to all listings
        </Link>

        <div className="grid grid-cols-1 gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Gallery images={property.images ?? []} alt={property.title} />

            <div className="mt-10">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="green">{property.listing_type === "sale" ? "For sale" : "To let"}</Badge>
                <Badge tone="neutral">{property.property_type}</Badge>
                <StatusBadge status={property.availability} />
              </div>

              <h1 className="mt-5 font-display text-3xl font-light tracking-tighter sm:text-4xl">
                {property.title}
              </h1>
              <p className="mt-3 flex items-center gap-2 text-base text-black/50">
                <MapPin className="h-4 w-4 text-forest" strokeWidth={1.5} />
                {property.location}
              </p>
              <p className="mt-5 text-2xl font-medium text-forest">{priceLabel}</p>

              {facts.length > 0 && (
                <dl className="mt-8 grid grid-cols-3 gap-6 border-y border-black/10 py-8">
                  {facts.map((fact) => (
                    <div key={fact.label}>
                      <dt className="flex items-center gap-2 text-xs uppercase tracking-widest text-black/40">
                        <fact.icon className="h-3.5 w-3.5 text-forest" strokeWidth={1.5} />
                        {fact.label}
                      </dt>
                      <dd className="mt-2 text-base">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {property.description && (
                <section className="mt-8">
                  <h2 className="font-display text-xl font-light tracking-tight">Description</h2>
                  <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-black/60">
                    {property.description}
                  </p>
                </section>
              )}

              {property.amenities.length > 0 && (
                <section className="mt-10">
                  <h2 className="font-display text-xl font-light tracking-tight">Features &amp; amenities</h2>
                  <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {property.amenities.map((amenity) => (
                      <li key={amenity} className="flex items-start gap-2.5 text-sm text-black/60">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-leaf" strokeWidth={1.75} />
                        {amenity}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {property.address && (
                <section className="mt-10">
                  <h2 className="font-display text-xl font-light tracking-tight">Address</h2>
                  <p className="mt-4 text-base text-black/60">{property.address}</p>
                </section>
              )}
            </div>
          </div>

          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <div className="card-surface p-7">
                <h2 className="font-display text-2xl font-light tracking-tight">Enquire about this property</h2>
                <p className="mt-2 text-sm text-black/50">
                  Send us a message and we will arrange a viewing or answer your questions.
                </p>

                {(property.contact_name || property.contact_phone || property.contact_email) && (
                  <div className="mt-5 rounded-xl bg-sage/60 p-4 text-sm">
                    {property.contact_name && <p className="font-medium">{property.contact_name}</p>}
                    {property.contact_phone && (
                      <a href={`tel:${property.contact_phone}`} className="mt-1 block text-forest hover:underline">
                        {property.contact_phone}
                      </a>
                    )}
                    {property.contact_email && (
                      <a href={`mailto:${property.contact_email}`} className="mt-1 block text-forest hover:underline">
                        {property.contact_email}
                      </a>
                    )}
                  </div>
                )}

                <div className="mt-7">
                  <EnquiryForm
                    action={submitPropertyEnquiry}
                    fields={FIELDS}
                    hidden={{ property_id: property.id }}
                    submitLabel="Send property enquiry"
                    whatsappHref={wa}
                  />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </article>
  );
}
