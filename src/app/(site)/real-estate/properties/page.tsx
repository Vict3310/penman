import { Suspense } from "react";
import type { Metadata } from "next";
import { FilterForm, type FilterField } from "@/components/filter-form";
import { ResultsSkeleton } from "@/components/catalogue-skeleton";
import { PageHeader } from "@/components/page-header";
import { PropertyCard } from "@/components/cards";
import { EmptyState, Pagination } from "@/components/ui/misc";
import { DataModeNotice } from "@/components/data-mode-notice";
import { listProperties } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/env";
import { buildQuery, readNumber, readPage, readSort, readString, type RawSearchParams } from "@/lib/search-params";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Real Estate Properties",
  description: "Browse available properties for sale or rent across Penman Empire Real Estate.",
  alternates: { canonical: "/real-estate/properties" },
};

const SORTS = ["newest", "price_asc", "price_desc"] as const;
const PROPERTY_TYPES = [
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "duplex", label: "Duplex" },
  { value: "bungalow", label: "Bungalow" },
  { value: "land", label: "Land" },
  { value: "commercial", label: "Commercial" },
];

export default async function RealEstatePropertiesPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const params = await searchParams;
  const filters = {
    q: readString(params, "q"),
    location: readString(params, "location"),
    propertyType: readString(params, "property_type"),
    listingType: readString(params, "listing_type"),
    bedrooms: readNumber(params, "bedrooms"),
    minPrice: readNumber(params, "minPrice"),
    maxPrice: readNumber(params, "maxPrice"),
    sort: readSort(params, "sort", SORTS, "newest"),
    page: readPage(params),
  };

  const fields: FilterField[] = [
    { name: "q", label: "Search", type: "text", placeholder: "Title or description" },
    { name: "location", label: "Location", type: "text", placeholder: "Area or city" },
    { name: "listing_type", label: "For", type: "select", options: [{ value: "sale", label: "Sale" }, { value: "rent", label: "Rent" }] },
    { name: "property_type", label: "Property type", type: "select", options: PROPERTY_TYPES },
    { name: "bedrooms", label: "Min bedrooms", type: "number", placeholder: "e.g. 3" },
    { name: "minPrice", label: "Min price", type: "number", placeholder: "e.g. 5000000" },
    { name: "maxPrice", label: "Max price", type: "number", placeholder: "e.g. 90000000" },
    { name: "sort", label: "Sort by", type: "select", options: [{ value: "newest", label: "Newest first" }, { value: "price_asc", label: "Price: low to high" }, { value: "price_desc", label: "Price: high to low" }] },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Real estate properties"
        title="Find the right"
        emphasis="property."
        description="Explore current listings by type, location, price and bedroom count."
      />

      <section className="shell pb-24 sm:pb-32">
        {!isSupabaseConfigured() && (
          <div className="mb-8">
            <DataModeNotice context="Listings are read from your database." />
          </div>
        )}

        <FilterForm action="/real-estate/properties" fields={fields} values={{ q: filters.q, location: filters.location, listing_type: filters.listingType, property_type: filters.propertyType, bedrooms: filters.bedrooms?.toString(), minPrice: filters.minPrice?.toString(), maxPrice: filters.maxPrice?.toString(), sort: filters.sort === "newest" ? undefined : filters.sort }} />

        <Suspense fallback={<ResultsSkeleton />}>
          <PropertyResults filters={filters} params={params} />
        </Suspense>
      </section>
    </>
  );
}

async function PropertyResults({ filters, params }: { filters: Parameters<typeof listProperties>[0]; params: RawSearchParams }) {
  const result = await listProperties(filters);

  if (result.items.length === 0) {
    const pastEnd = result.total > 0;
    return pastEnd ? (
      <EmptyState title="No listings on this page" description="That page is past the end of the results." action={{ href: "/real-estate/properties", label: "Back to the first page" }} />
    ) : (
      <EmptyState title="No properties match your search" description="Try widening the price range or clearing a filter. New listings are added regularly." action={{ href: "/real-estate/contact", label: "Tell us what you need" }} />
    );
  }

  return (
    <>
      <p className="mb-6 text-sm text-black/50">Showing {result.items.length} of {result.total} listing{result.total === 1 ? "" : "s"}</p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((property, i) => (
          <div key={property.id} data-reveal style={{ transitionDelay: `${Math.min(i, 5) * 90}ms` }}>
            <PropertyCard property={property} />
          </div>
        ))}
      </div>
      <Pagination page={result.page} pageCount={result.pageCount} buildHref={(page) => `/real-estate/properties${buildQuery(params, { page: String(page) })}`} />
    </>
  );
}
