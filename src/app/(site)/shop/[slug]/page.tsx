import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Info, Package, ShoppingBag } from "lucide-react";
import { submitShopEnquiry } from "@/app/actions/public";
import { EnquiryForm, type EnquiryField } from "@/components/enquiry-form";
import { Gallery } from "@/components/gallery";
import { MotionWords } from "@/components/motion-words";
import { ProductCard } from "@/components/cards";
import { CompareButton } from "@/components/shop/compare";
import { Badge, StatusBadge } from "@/components/ui/misc";
import { SaveButton } from "@/components/account/save-button";
import { getProductBySlug, listProducts } from "@/lib/queries";
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
  const shareImage = product.images?.find((item) => item.type !== "video");
  const description = product.seo_description || product.description?.slice(0, 155) ||
    (product.is_reference
      ? `${product.name} model reference with real photography. Price and stock are not verified.`
      : `${product.name} at Penman Autos. Ask about price and availability.`);

  return {
    title,
    description,
    alternates: { canonical: `/shop/${product.slug}` },
    openGraph: {
      title,
      description,
      images: shareImage?.url ? [{ url: shareImage.url }] : undefined,
    },
  };
}

const FIELDS: EnquiryField[] = [
  { name: "intent", label: "I would like to", type: "select", options: [{ value: "question", label: "Ask about this car" }, { value: "viewing", label: "Book a viewing" }, { value: "sourcing", label: "Discuss sourcing" }] },
  { name: "name", label: "Your name", type: "text", required: true, half: true, placeholder: "Full name" },
  { name: "phone", label: "Phone number", type: "tel", required: true, half: true, placeholder: "+234…" },
  { name: "email", label: "Email (optional)", type: "email", half: true, placeholder: "you@example.com" },
  { name: "message", label: "Your message", type: "textarea", rows: 4, placeholder: "Preferred year, specification, budget or viewing time…" },
];

const REFERENCE_FIELDS: EnquiryField[] = FIELDS.map((field) =>
  field.name === "intent" ? { ...field, options: [{ value: "question", label: "Ask about this model" }, { value: "sourcing", label: "Discuss sourcing" }] } :
  field.name === "message"
    ? { ...field, label: "Preferred year, budget or questions", placeholder: "Tell us what you are looking for…" }
    : field,
);

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [settings, relatedResult] = await Promise.all([
    getSiteSettings(),
    listProducts({ category: "cars", make: product.specs?.make || undefined, perPage: 6 }),
  ]);
  const related = relatedResult.items.filter((item) => item.id !== product.id).slice(0, 3);
  const outOfStock = product.track_stock && product.stock_quantity <= 0;
  const imported = isImported(product);
  const specs = product.specs ?? {};

  // Only the specifications the source actually stated. A row we do not have
  // is omitted, never filled with a guess.
  const vehicleFacts = [
    specs.make || specs.model ? { label: "Make & model", value: [specs.make, specs.model].filter(Boolean).join(" ") } : null,
    specs.body_style ? { label: "Body style", value: specs.body_style } : null,
    specs.year ? { label: "Year", value: String(specs.year) } : null,
    !product.is_reference && formatMileage(specs.mileage_km) ? { label: "Mileage", value: formatMileage(specs.mileage_km) as string } : null,
    specs.condition_label ? { label: "Condition", value: specs.condition_label } : null,
    specs.colour ? { label: "Colour", value: specs.colour } : null,
    specs.region ? { label: "Location", value: specs.region } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const wa = whatsappLink(
    settings.contact.whatsapp,
    product.is_reference
      ? `Hello ${settings.brand.business_name}, I'd like to ask about sourcing a ${product.name}.`
      : `Hello ${settings.brand.business_name}, I'd like to enquire about buying: ${product.name}.`,
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    sku: product.sku ?? undefined,
    image: product.images?.filter((item) => item.type !== "video").map((item) => item.url),
    category: product.category?.name ?? undefined,
    // No `offers` block for an imported listing: the price is the source
    // marketplace's asking price and the vehicle's availability has not been
    // verified, so publishing either as structured data would be a claim this
    // business cannot stand behind.
    offers:
      !imported && !product.is_reference && product.price
        ? {
            "@type": "Offer",
            price: product.price,
            priceCurrency: product.currency,
            availability: outOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
          }
        : undefined,
  };

  return (
    <article className="pb-24 pt-10 sm:pb-24 sm:pt-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="shell">
        <Link
          href="/shop"
          className="mb-10 inline-flex items-center gap-2 text-sm text-black/50 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          Back to cars
        </Link>

        <div className="mb-7"><p data-reveal className="store-eyebrow">{specs.make || "Penman Autos"} · {specs.body_style || "Car details"}</p><h1 data-reveal-words className="mt-2 font-display text-3xl font-semibold tracking-tight text-[#17231d] sm:text-5xl"><MotionWords text={product.name} /></h1></div>

        <div className="grid grid-cols-1 gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div data-reveal><Gallery images={product.images ?? []} alt={product.name} /></div>

            <div className="mt-10">
              <div className="flex flex-wrap items-center gap-2">
                {product.category?.name && <Badge tone="neutral">{product.category.name}</Badge>}
                {imported && <Badge tone="amber">Imported listing</Badge>}
                {product.is_reference && <Badge tone="amber">Model reference</Badge>}
                {product.is_featured && <Badge tone="green">Featured</Badge>}
                {product.track_stock && (
                  <StatusBadge status={outOfStock ? "unavailable" : "available"} />
                )}
              </div>

              <h2 className="mt-6 font-display text-2xl font-semibold tracking-tight">Vehicle overview</h2>
              {product.is_reference && <p className="mt-3 text-sm text-black/55">This photograph shows a real {product.name} model. It does not identify a vehicle currently held or offered for sale by Penman Empire.</p>}

              <dl className="mt-8 grid grid-cols-2 gap-6 border-y border-black/10 py-8">
                {product.sku && !product.is_reference && (
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
                    {product.is_reference
                      ? "Stock and price not verified — ask us to source this model"
                      : imported
                      ? // Never "available" for an imported listing: nobody here
                        // has seen the car, so the honest answer is that it is
                        // not verified.
                        "Not verified — imported listing"
                      : !product.track_stock
                        ? "Ask us to confirm availability"
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
                    {imported ? "What the source listing said" : product.is_reference ? "About this model" : "Product details"}
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
              <div data-reveal style={{ transitionDelay: "140ms" }} className="rounded-[1.6rem] border border-black/10 bg-white p-6 shadow-[0_12px_36px_rgba(18,32,26,0.06)] sm:p-7">
                <p className="store-eyebrow">{product.is_reference ? "Model reference" : "Vehicle listing"}</p>
                <p className="mt-2 font-display text-3xl font-semibold text-[#17231d]">{product.is_reference || !product.price ? "Ask for price" : formatCurrency(product.price, product.currency)}</p>
                <p className="mt-2 text-sm text-black/55">{product.is_reference ? "Tell us the year and specification you want. We’ll discuss sourcing options." : "Ask us to confirm this car’s availability and next steps."}</p>
                <div className="mt-5 flex flex-wrap gap-3"><a href="#enquire" className="inline-flex items-center justify-center rounded-full bg-[#17231d] px-5 py-3 text-sm font-semibold text-white">{product.is_reference ? "Ask about this model" : "Book a viewing"}</a><CompareButton product={product} large /><SaveButton kind="product" listingId={product.id} title={product.name} variant="inline" /></div>
                <div id="enquire" className="scroll-mt-32 border-t border-black/10 pt-6 mt-6">
                <h2 className="font-display text-2xl font-semibold tracking-tight">{product.is_reference ? "Ask about this model" : "Enquire or book a viewing"}</h2>
                <p className="mt-2 text-sm text-black/50">
                  {product.is_reference ? "Tell us your preferred year, condition and budget. We can discuss sourcing options." : "Send a purchase enquiry and we will confirm pricing, condition and the next steps with you."}
                </p>
                <div className="mt-7">
                  <EnquiryForm
                    action={submitShopEnquiry}
                    fields={product.is_reference ? REFERENCE_FIELDS : FIELDS}
                    hidden={{ product_id: product.id, channel: "form", quantity: "1" }}
                    submitLabel={product.is_reference ? "Ask about this model" : "Send purchase enquiry"}
                    whatsappHref={wa}
                    whatsappLabel="Or enquire on WhatsApp"
                  />
                </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
        {related.length > 0 && <section className="mt-20 border-t border-black/10 pt-12"><div className="mb-7 flex items-end justify-between gap-4"><div><p data-reveal className="store-eyebrow">Keep exploring</p><h2 data-reveal-words className="store-heading mt-2"><MotionWords text="You may also like" /></h2></div><Link href="/shop/cars" className="store-text-link">All cars <ArrowLeft className="h-4 w-4 rotate-180" /></Link></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{related.map((item, index) => <div key={item.id} data-reveal style={{ transitionDelay: `${index * 85}ms` }}><ProductCard product={item} /></div>)}</div></section>}
      </div>
    </article>
  );
}
