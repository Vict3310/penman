import Link from "next/link";
import { ArrowUpRight, BedDouble, Bath, CalendarDays, Fuel, Gauge, MapPin, Settings2, ShieldCheck, Users } from "lucide-react";
import { SaveButton } from "@/components/account/save-button";
import { ImageFallback, SafeImage } from "@/components/ui/safe-image";
import { Badge, StatusBadge } from "@/components/ui/misc";
import { cn, formatCurrency, formatMileage } from "@/lib/utils";
import { isImported, type MediaRef, type Product, type Property, type Vehicle } from "@/lib/types";

/* ── Shared figure ───────────────────────────────────────────────────── */

export function Figure({
  images,
  alt,
  className,
  sizes = "(max-width: 768px) 100vw, 33vw",
  priority = false,
  hoverZoom = true,
}: {
  images: MediaRef[] | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  hoverZoom?: boolean;
}) {
  const first = images?.[0];
  return (
    <div className={cn("relative overflow-hidden bg-sage/60", className)}>
      {first?.url ? (
        // SafeImage renders the same placeholder if the file will not load, so
        // a removed or broken image never leaves an empty frame.
        <SafeImage
          src={first.url}
          alt={first.alt || alt}
          sizes={sizes}
          priority={priority}
          className={cn(
            "object-cover transition-transform duration-700 ease-out",
            hoverZoom && "group-hover:scale-105",
          )}
        />
      ) : (
        <ImageFallback alt={alt} />
      )}
    </div>
  );
}

/* ── Vehicle card ────────────────────────────────────────────────────── */

export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const specs = [
    vehicle.seats ? { icon: Users, label: `${vehicle.seats} seats` } : null,
    vehicle.transmission ? { icon: Settings2, label: vehicle.transmission } : null,
    vehicle.fuel_type ? { icon: Fuel, label: vehicle.fuel_type } : null,
  ].filter(Boolean) as { icon: typeof Users; label: string }[];

  return (
    // The save control is a SIBLING of the link, not a child of it. A button
    // inside an anchor is invalid HTML and the click would navigate to the
    // listing instead of saving it.
    <div className="relative h-full">
      <Link
        href={`/rental/${vehicle.slug}`}
        className="group card-surface card-vehicle flex h-full flex-col overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(18,40,26,0.12)]"
      >
      <div className="relative">
        <Figure images={vehicle.images} alt={vehicle.name} className="aspect-[4/3]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="card-badge card-badge-vehicle">{vehicle.category}</span>
          {vehicle.availability !== "available" && <StatusBadge status={vehicle.availability} />}
        </div>
      </div>
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="card-kicker">Mobility</span>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-forest transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.5} />
        </div>
        <h3 className="font-display text-xl font-light tracking-tight text-ink">{vehicle.name}</h3>
        <p className="mt-2 flex items-baseline gap-2 text-sm text-black/55">
          <span className="card-price">{formatCurrency(vehicle.rate, vehicle.currency)}</span>
          {vehicle.rate ? <span className="text-black/40">/ {vehicle.rate_period}</span> : null}
        </p>
        {specs.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-black/10 pt-4 text-xs text-black/55">
            {specs.map((spec) => (
              <li key={spec.label} className="flex items-center gap-1.5 capitalize">
                <spec.icon className="h-3.5 w-3.5 text-forest" strokeWidth={1.5} />
                {spec.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      </Link>

      <div className="absolute right-3 top-3 z-10">
        <SaveButton kind="vehicle" listingId={vehicle.id} title={vehicle.name} />
      </div>
    </div>
  );
}

/* ── Property card ───────────────────────────────────────────────────── */

export function PropertyCard({ property }: { property: Property }) {
  const facts = [
    property.bedrooms ? { icon: BedDouble, label: `${property.bedrooms} bed` } : null,
    property.bathrooms ? { icon: Bath, label: `${property.bathrooms} bath` } : null,
    property.area_sqm ? { icon: MapPin, label: `${property.area_sqm} m²` } : null,
  ].filter(Boolean) as { icon: typeof MapPin; label: string }[];

  const priceLabel =
    property.price_type === "on_request" || property.price === null
      ? "Price on request"
      : `${formatCurrency(property.price, property.currency)}${property.listing_type === "rent" ? " / year" : ""}`;

  return (
    <div className="relative h-full">
      <Link
        href={`/real-estate/${property.slug}`}
        className="group card-surface card-property flex h-full flex-col overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(18,40,26,0.12)]"
      >
      <div className="relative">
        <Figure images={property.images} alt={property.title} className="aspect-[4/3]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="card-badge card-badge-property">
            {property.listing_type === "sale" ? "For sale" : "To let"}
          </span>
          {property.is_featured && <span className="card-badge card-badge-neutral">Featured</span>}
        </div>
      </div>
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="card-kicker">Property</span>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-forest transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.5} />
        </div>
        <h3 className="font-display text-xl font-light tracking-tight text-ink">{property.title}</h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-black/55">
          <MapPin className="h-3.5 w-3.5 text-forest" strokeWidth={1.5} />
          {property.location}
        </p>
        <p className="mt-3 text-base font-semibold text-forest">{priceLabel}</p>
        {facts.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-black/10 pt-4 text-xs text-black/55">
            {facts.map((fact) => (
              <li key={fact.label} className="flex items-center gap-1.5">
                <fact.icon className="h-3.5 w-3.5 text-forest" strokeWidth={1.5} />
                {fact.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      </Link>

      <div className="absolute right-3 top-3 z-10">
        <SaveButton kind="property" listingId={property.id} title={property.title} />
      </div>
    </div>
  );
}

/* ── Product card ────────────────────────────────────────────────────── */

export function ProductCard({ product }: { product: Product }) {
  const outOfStock = product.track_stock && product.stock_quantity <= 0;
  const imported = isImported(product);
  const specs = product.specs ?? {};

  // Only facts the source actually stated: a year or mileage we do not have is
  // left out rather than filled with a placeholder.
  const facts = [
    specs.year ? { icon: CalendarDays, label: String(specs.year) } : null,
    formatMileage(specs.mileage_km) ? { icon: Gauge, label: formatMileage(specs.mileage_km) as string } : null,
    specs.condition_label ? { icon: ShieldCheck, label: specs.condition_label } : null,
  ].filter(Boolean) as { icon: typeof Users; label: string }[];

  return (
    <div className="relative h-full">
      <Link
        href={`/shop/${product.slug}`}
        className="group card-surface card-product flex h-full flex-col overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(18,40,26,0.12)]"
      >
      <div className="relative">
        <Figure images={product.images} alt={product.name} className="aspect-square" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {product.category?.name && <span className="card-badge card-badge-neutral">{product.category.name}</span>}
          {imported && <span className="card-badge card-badge-neutral">Imported</span>}
          {outOfStock && <StatusBadge status="unavailable" />}
        </div>
      </div>
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="card-kicker">Cars for Sale</span>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-forest transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.5} />
        </div>
        <h3 className="font-display text-lg font-light tracking-tight text-ink">{product.name}</h3>
        {product.description && (
          <p className="mt-2 line-clamp-2 text-sm text-black/55">{product.description}</p>
        )}
        <p className="mt-4 text-base font-semibold text-forest">{formatCurrency(product.price, product.currency)}</p>
        {imported && (
          // The number is the source marketplace's asking price, not a quote
          // from this business, and saying so on the card is the difference
          // between provenance and a misleading price.
          <p className="mt-1 text-xs text-black/40">Source marketplace price — not a Penman Empire quote</p>
        )}
        {facts.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-black/10 pt-4 text-xs text-black/55">
            {facts.map((fact) => (
              <li key={fact.label} className="flex items-center gap-1.5">
                <fact.icon className="h-3.5 w-3.5 text-forest" strokeWidth={1.5} />
                {fact.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      </Link>

      <div className="absolute right-3 top-3 z-10">
        <SaveButton kind="product" listingId={product.id} title={product.name} />
      </div>
    </div>
  );
}
