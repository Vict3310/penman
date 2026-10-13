import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BedDouble, Bath, Fuel, MapPin, Settings2, Users } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/misc";
import { cn, formatCurrency } from "@/lib/utils";
import type { MediaRef, Product, Property, Vehicle } from "@/lib/types";

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
        <Image
          src={first.url}
          alt={first.alt || alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn(
            "object-cover transition-transform duration-700 ease-out",
            hoverZoom && "group-hover:scale-105",
          )}
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-sage to-cream">
          <span className="px-4 text-center text-xs uppercase tracking-[0.25em] text-forest/50">{alt}</span>
        </div>
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
    <Link
      href={`/rental/${vehicle.slug}`}
      className="group card-surface card-vehicle overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(18,40,26,0.12)]"
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
    <Link
      href={`/real-estate/${property.slug}`}
      className="group card-surface card-property overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(18,40,26,0.12)]"
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
  );
}

/* ── Product card ────────────────────────────────────────────────────── */

export function ProductCard({ product }: { product: Product }) {
  const outOfStock = product.track_stock && product.stock_quantity <= 0;
  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group card-surface card-product overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(18,40,26,0.12)]"
    >
      <div className="relative">
        <Figure images={product.images} alt={product.name} className="aspect-square" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {product.category?.name && <span className="card-badge card-badge-neutral">{product.category.name}</span>}
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
      </div>
    </Link>
  );
}
