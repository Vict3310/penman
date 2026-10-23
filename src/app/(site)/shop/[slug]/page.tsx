import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Info, Package, ShoppingBag } from "lucide-react";
import { submitShopEnquiry } from "@/app/actions/public";
import { EnquiryForm, type EnquiryField } from "@/components/enquiry-form";
import { Gallery } from "@/components/gallery";
import { Badge, StatusBadge } from "@/components/ui/misc";
import { SaveButton } from "@/components/account/save-button";
import { getProductBySlug } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site";
import { isImported } from "@/lib/types";
import { formatCurrency, formatDate, formatMileage, whatsappLink } from "@/lib/utils";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };

  const title = product.seo_title || product.name;
  const description =
    product.seo_description ||
    product.description?.slice(0, 155) ||
    `${product.name} available from the Penman Empire vehicle marketplace.`;

  return {
    title,
    description,
    alternates: { canonical: `/shop/${product.slug}` },
    openGraph: {
      title,
      description,
      images: product.images?.[0]?.url ? [{ url: product.images[0].url }] : undefined,
    },
  };
}

const FIELDS: EnquiryField[] = [
  { name: "name", label: "Your name", type: "text", required: true, half: true, placeholder: "Full name" },
  { name: "phone", label: "Phone number", type: "tel", required: true, half: true, placeholder: "+234…" },
  { name: "email", label: "Email (optional)", type: "email", half: true, placeholder: "you@example.com" },
  { name: "quantity", label: "Quantity", type: "number", required: true, half: true, min: "1", defaultValue: "1" },
  { name: "message", label: "Order notes", type: "textarea", rows: 4, placeholder: "Delivery location, preferred timing…" },
];

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const settings = await getSiteSettings();
  const outOfStock = product.track_stock && product.stock_quantity <= 0;
  const imported = isImported(product);
  const specs = product.specs ?? {};

  // Only the specifications the source actually stated. A row we do not have
  // is omitted, never filled with a guess.
  const vehicleFacts = [
    specs.make || specs.model ? { label: "Make & model", value: [specs.make, specs.model].filter(Boolean).join(" ") } : null,
    specs.year ? { label: "Year", value: String(specs.year) } : null,
    formatMileage(specs.mileage_km) ? { label: "Mileage", value: formatMileage(specs.mileage_km) as string } : null,
    specs.condition_label ? { label: "Condition", value: specs.condition_label } : null,
    specs.colour ? { label: "Colour", value: specs.colour } : null,
    specs.region ? { label: "Location", value: specs.region } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const wa = whatsappLink(
    settings.contact.whatsapp,
    `Hello ${settings.brand.business_name}, I'd like to enquire about buying: ${product.name}.`,
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    sku: product.sku ?? undefined,
    image: product.images?.map((i) => i.url),
    category: product.category?.name ?? undefined,
    // No `offers` block for an imported listing: the price is the source
    // marketplace's asking price and the vehicle's availability has not been
    // verified, so publishing either as structured data would be a claim this
    // business cannot stand behind.
    offers:
      !imported && product.price
        ? {
            "@type": "Offer",
            price: product.price,
            priceCurrency: product.currency,
            availability: outOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
          }
        : undefined,
  };

  return (
    <article className="pb-24 pt-36 sm:pb-32 sm:pt-44">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="shell">
        <Link
          href="/shop"
          className="mb-10 inline-flex items-center gap-2 text-sm text-black/50 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          Back to the marketplace
        </Link>

        <div className="grid grid-cols-1 gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Gallery images={product.images ?? []} alt={product.name} />

            <div className="mt-10">
              <div className="flex flex-wrap items-center gap-2">
                {product.category?.name && <Badge tone="neutral">{product.category.name}</Badge>}
                {imported && <Badge tone="amber">Imported listing</Badge>}
                {product.is_featured && <Badge tone="green">Featured</Badge>}
                {product.track_stock && (
                  <StatusBadge status={outOfStock ? "unavailable" : "available"} />
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                <h1 className="font-display text-3xl font-light tracking-tighter sm:text-4xl">
                  {product.name}
                </h1>
                <SaveButton
                  kind="product"
                  listingId={product.id}
                  title={product.name}
                  variant="inline"
                />
              </div>
              <p className="mt-4 text-2xl font-medium text-forest">
                {formatCurrency(product.price, product.currency)}
              </p>

              <dl className="mt-8 grid grid-cols-2 gap-6 border-y border-black/10 py-8">
                {product.sku && (
                  <div>
                    <dt className="flex items-center gap-2 text-xs uppercase tracking-widest text-black/40">
                      <Package className="h-3.5 w-3.5 text-forest" strokeWidth={1.5} />
                      SKU
                    </dt>
                    <dd className="mt-2 text-base">{product.sku}</dd>
                  </div>
                )}
                <div>
                  <dt className="flex items-center gap-2 text-xs uppercase tracking-widest text-black/40">
                    <ShoppingBag className="h-3.5 w-3.5 text-forest" strokeWidth={1.5} />
                    Availability
                  </dt>
                  <dd className="mt-2 text-base">
                    {imported
                      ? // Never "available" for an imported listing: nobody here
                        // has seen the car, so the honest answer is that it is
                        // not verified.
                        "Not verified — imported listing"
                      : !product.track_stock
                        ? "Available to order"
                        : product.stock_quantity > 0
                          ? `${product.stock_quantity} in stock`
                          : "Currently out of stock"}
                  </dd>
                </div>
              </dl>

              {vehicleFacts.length > 0 && (
                <section className="mt-8">
                  <h2 className="font-display text-xl font-light tracking-tight">
                    {imported ? "Specifications as listed by the source" : "Vehicle details"}
                  </h2>
                  <dl className="mt-5 grid grid-cols-1 gap-x-10 sm:grid-cols-2">
                    {vehicleFacts.map((fact) => (
                      <div
                        key={fact.label}
                        className="flex items-baseline justify-between gap-4 border-b border-black/10 py-3"
                      >
                        <dt className="text-xs uppercase tracking-widest text-black/40">{fact.label}</dt>
                        <dd className="text-right text-base text-ink">{fact.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              {imported && (
                <section className="mt-8 rounded-3xl border border-amber-500/25 bg-amber-50/70 p-6">
                  <div className="flex items-start gap-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" strokeWidth={1.5} />
                    <div className="text-sm leading-relaxed text-amber-900">
                      <p className="font-medium">Historic marketplace listing</p>
                      <p className="mt-2">
                        {specs.availability_note ??
                          "This vehicle is not part of Penman Empire inventory and its availability has not been verified."}
                      </p>
                      <p className="mt-2">{specs.price_note}</p>
                      <ul className="mt-3 space-y-1 text-xs">
                        {specs.condition_label && <li>Condition as stated by the source: {specs.condition_label}</li>}
                        {specs.source_price_raw && <li>Asking price as stated by the source: {specs.source_price_raw}</li>}
                        {specs.source_mileage_raw && <li>Odometer as stated by the source: {specs.source_mileage_raw}</li>}
                        <li>
                          Imported {formatDate(product.imported_at)} from {product.inventory_source}
                        </li>
                      </ul>
                      {product.source_url && (
                        <a
                          href={product.source_url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium underline decoration-amber-700/40 underline-offset-4"
                        >
                          Open the source listing image
                          <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                        </a>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {product.description && (
                <section className="mt-8">
                  <h2 className="font-display text-xl font-light tracking-tight">
                    {imported ? "What the source listing said" : "Product details"}
                  </h2>
                  <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-black/60">
                    {product.description}
                  </p>
                </section>
              )}
            </div>
          </div>

          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <div className="card-surface p-7">
                <h2 className="font-display text-2xl font-light tracking-tight">Enquire about this vehicle</h2>
                <p className="mt-2 text-sm text-black/50">
                  Send a purchase enquiry and we will confirm pricing, condition and the next steps with you.
                </p>
                <div className="mt-7">
                  <EnquiryForm
                    action={submitShopEnquiry}
                    fields={FIELDS}
                    hidden={{ product_id: product.id, channel: "form" }}
                    submitLabel="Send purchase enquiry"
                    whatsappHref={wa}
                    whatsappLabel="Or enquire on WhatsApp"
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
