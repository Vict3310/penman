import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Fuel, Settings2, Users } from "lucide-react";
import { submitRentalEnquiry } from "@/app/actions/public";
import { EnquiryForm, type EnquiryField } from "@/components/enquiry-form";
import { Gallery } from "@/components/gallery";
import { Badge, StatusBadge } from "@/components/ui/misc";
import { SaveButton } from "@/components/account/save-button";
import { getVehicleBySlug } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site";
import { formatCurrency, whatsappLink } from "@/lib/utils";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = await getVehicleBySlug(slug);
  if (!vehicle) return { title: "Vehicle not found" };

  const title = vehicle.seo_title || vehicle.name;
  const description =
    vehicle.seo_description ||
    vehicle.description?.slice(0, 155) ||
    `${vehicle.name} available for hire from Penman Empire.`;

  return {
    title,
    description,
    alternates: { canonical: `/rental/${vehicle.slug}` },
    openGraph: {
      title,
      description,
      images: vehicle.images?.[0]?.url ? [{ url: vehicle.images[0].url }] : undefined,
    },
  };
}

const FIELDS: EnquiryField[] = [
  { name: "name", label: "Your name", type: "text", required: true, half: true, placeholder: "Full name" },
  { name: "phone", label: "Phone number", type: "tel", required: true, half: true, placeholder: "+234…" },
  { name: "email", label: "Email (optional)", type: "email", half: true, placeholder: "you@example.com" },
  { name: "pickup_date", label: "Pickup date", type: "date", required: true, half: true },
  { name: "return_date", label: "Return date", type: "date", required: true, half: true },
  { name: "message", label: "Anything else?", type: "textarea", rows: 4, placeholder: "Pickup point, duration, driver needed…" },
];

export default async function VehicleDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const vehicle = await getVehicleBySlug(slug);
  if (!vehicle) notFound();

  const settings = await getSiteSettings();

  const specs = [
    vehicle.seats ? { icon: Users, label: "Seats", value: String(vehicle.seats) } : null,
    vehicle.transmission ? { icon: Settings2, label: "Transmission", value: vehicle.transmission } : null,
    vehicle.fuel_type ? { icon: Fuel, label: "Fuel", value: vehicle.fuel_type } : null,
    vehicle.year ? { icon: CalendarDays, label: "Year", value: String(vehicle.year) } : null,
  ].filter(Boolean) as { icon: typeof Users; label: string; value: string }[];

  const wa = whatsappLink(
    settings.contact.whatsapp,
    `Hello ${settings.brand.business_name}, I'd like to enquire about hiring the ${vehicle.name}.`,
  );

  const priceLabel = vehicle.rate
    ? `${formatCurrency(vehicle.rate, vehicle.currency)} / ${vehicle.rate_period}`
    : "Rate on request";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: vehicle.name,
    description: vehicle.description ?? undefined,
    category: vehicle.category,
    image: vehicle.images?.map((i) => i.url),
    offers: vehicle.rate
      ? {
          "@type": "Offer",
          price: vehicle.rate,
          priceCurrency: vehicle.currency,
          availability:
            vehicle.availability === "available"
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
        }
      : undefined,
  };

  return (
    <article className="pb-24 pt-36 sm:pb-32 sm:pt-44">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="shell">
        <Link
          href="/rental"
          className="mb-10 inline-flex items-center gap-2 text-sm text-black/50 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          Back to all vehicles
        </Link>

        <div className="grid grid-cols-1 gap-14 lg:grid-cols-12">
          {/* ── Left: gallery + detail ── */}
          <div className="lg:col-span-7">
            <Gallery images={vehicle.images ?? []} alt={vehicle.name} />

            <div className="mt-10">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{vehicle.category}</Badge>
                <StatusBadge status={vehicle.availability} />
                {vehicle.is_featured && <Badge tone="green">Featured</Badge>}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                <h1 className="font-display text-3xl font-light tracking-tighter sm:text-4xl">
                  {vehicle.name}
                </h1>
                <SaveButton
                  kind="vehicle"
                  listingId={vehicle.id}
                  title={vehicle.name}
                  variant="inline"
                />
              </div>
              <p className="mt-4 text-2xl font-medium text-forest">{priceLabel}</p>

              {specs.length > 0 && (
                <dl className="mt-8 grid grid-cols-2 gap-6 border-y border-black/10 py-8 sm:grid-cols-4">
                  {specs.map((spec) => (
                    <div key={spec.label}>
                      <dt className="flex items-center gap-2 text-xs uppercase tracking-widest text-black/40">
                        <spec.icon className="h-3.5 w-3.5 text-forest" strokeWidth={1.5} />
                        {spec.label}
                      </dt>
                      <dd className="mt-2 text-base capitalize">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {vehicle.description && (
                <section className="mt-8">
                  <h2 className="font-display text-xl font-light tracking-tight">About this vehicle</h2>
                  <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-black/60">
                    {vehicle.description}
                  </p>
                </section>
              )}

              {vehicle.rental_terms && (
                <section className="mt-8">
                  <h2 className="font-display text-xl font-light tracking-tight">Rental terms</h2>
                  <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-black/60">
                    {vehicle.rental_terms}
                  </p>
                </section>
              )}
            </div>
          </div>

          {/* ── Right: enquiry ── */}
          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <div className="card-surface p-7">
                <h2 className="font-display text-2xl font-light tracking-tight">Enquire about this vehicle</h2>
                <p className="mt-2 text-sm text-black/50">
                  Send your dates and we will confirm availability. Submitting this form does not reserve the
                  vehicle — our team confirms every request first.
                </p>
                <div className="mt-7">
                  <EnquiryForm
                    action={submitRentalEnquiry}
                    fields={FIELDS}
                    hidden={{ vehicle_id: vehicle.id }}
                    submitLabel="Send rental enquiry"
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
