import { Suspense } from "react";
import type { Metadata } from "next";
import { FilterForm, type FilterField } from "@/components/filter-form";
import { ResultsSkeleton } from "@/components/catalogue-skeleton";
import { PageHeader } from "@/components/page-header";
import { VehicleCard } from "@/components/cards";
import { EmptyState, Pagination } from "@/components/ui/misc";
import { DataModeNotice } from "@/components/data-mode-notice";
import { getVehicleCategories, listVehicles } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/env";
import { buildQuery, readNumber, readPage, readSort, readString, type RawSearchParams } from "@/lib/search-params";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Automobile Rentals",
  description:
    "Browse vehicles available for hire by the day, week or month. Send an enquiry and our team will confirm availability.",
  alternates: { canonical: "/rental" },
};

const SORTS = ["newest", "price_asc", "price_desc"] as const;

export default async function RentalPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;

  const filters = {
    q: readString(params, "q"),
    category: readString(params, "category"),
    transmission: readString(params, "transmission"),
    availability: readString(params, "availability"),
    minPrice: readNumber(params, "minPrice"),
    maxPrice: readNumber(params, "maxPrice"),
    sort: readSort(params, "sort", SORTS, "newest"),
    page: readPage(params),
  };

  const categories = await getVehicleCategories();

  const fields: FilterField[] = [
    { name: "q", label: "Search", type: "text", placeholder: "Vehicle name" },
    {
      name: "category",
      label: "Vehicle type",
      type: "select",
      options: categories.map((c) => ({ value: c, label: c })),
    },
    {
      name: "transmission",
      label: "Transmission",
      type: "select",
      options: [
        { value: "automatic", label: "Automatic" },
        { value: "manual", label: "Manual" },
        { value: "cvt", label: "CVT" },
      ],
    },
    {
      name: "availability",
      label: "Availability",
      type: "select",
      options: [
        { value: "available", label: "Available" },
        { value: "unavailable", label: "Unavailable" },
        { value: "maintenance", label: "In maintenance" },
      ],
    },
    { name: "minPrice", label: "Min rate", type: "number", placeholder: "e.g. 20000" },
    { name: "maxPrice", label: "Max rate", type: "number", placeholder: "e.g. 150000" },
    {
      name: "sort",
      label: "Sort by",
      type: "select",
      options: [
        { value: "newest", label: "Newest first" },
        { value: "price_asc", label: "Rate: low to high" },
        { value: "price_desc", label: "Rate: high to low" },
      ],
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Automobile rentals"
        title="Vehicles you can"
        emphasis="rely on."
        description="Every listing below is published by our team. Send an enquiry and we will confirm availability directly — nothing is reserved until a person confirms it."
      />

      <section className="shell pb-24 sm:pb-32">
        {!isSupabaseConfigured() && (
          <div className="mb-8">
            <DataModeNotice context="The rental catalogue reads from your database." />
          </div>
        )}

        <FilterForm
          action="/rental"
          fields={fields}
          values={{
            q: filters.q,
            category: filters.category,
            transmission: filters.transmission,
            availability: filters.availability,
            minPrice: filters.minPrice?.toString(),
            maxPrice: filters.maxPrice?.toString(),
            sort: filters.sort === "newest" ? undefined : filters.sort,
          }}
        />

        <Suspense fallback={<ResultsSkeleton />}>
          <VehicleResults filters={filters} params={params} />
        </Suspense>
      </section>
    </>
  );
}

async function VehicleResults({ filters, params }: { filters: Parameters<typeof listVehicles>[0]; params: RawSearchParams }) {
  const result = await listVehicles(filters);

  if (result.items.length === 0) {
    // Distinguish "nothing matched" from "this page is past the end".
    const pastEnd = result.total > 0;
    return pastEnd ? (
      <EmptyState
        title="No vehicles on this page"
        description="That page is past the end of the results."
        action={{ href: "/rental", label: "Back to the first page" }}
      />
    ) : (
      <EmptyState
        title="No vehicles match your search"
        description="Try clearing a filter, or contact us and tell us what you need — we may still be able to help."
        action={{ href: "/contact", label: "Send an enquiry" }}
      />
    );
  }

  return (
    <>
      <p className="mb-6 text-sm text-black/50">
        Showing {result.items.length} of {result.total} vehicle{result.total === 1 ? "" : "s"}
      </p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((vehicle, i) => (
          <div key={vehicle.id} data-reveal style={{ transitionDelay: `${Math.min(i, 5) * 90}ms` }}>
            <VehicleCard vehicle={vehicle} />
          </div>
        ))}
      </div>
      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        buildHref={(page) => `/rental${buildQuery(params, { page: String(page) })}`}
      />
    </>
  );
}
