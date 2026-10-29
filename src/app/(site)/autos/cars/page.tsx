import { Suspense } from "react";
import type { Metadata } from "next";
import { FilterForm, type FilterField } from "@/components/filter-form";
import { ResultsSkeleton } from "@/components/catalogue-skeleton";
import { PageHeader } from "@/components/page-header";
import { ProductCard } from "@/components/cards";
import { EmptyState, Pagination } from "@/components/ui/misc";
import { DataModeNotice } from "@/components/data-mode-notice";
import { listCategories, listProducts } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/env";
import { buildQuery, readPage, readSort, readString, type RawSearchParams } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Autos Cars",
  description: "Browse car models and ask Penman Empire Autos to confirm current stock and prices.",
  alternates: { canonical: "/autos/cars" },
};

const SORTS = ["newest", "price_asc", "price_desc"] as const;

export default async function AutosCarsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const params = await searchParams;
  const activeCategory = readString(params, "category");

  const filters = {
    q: readString(params, "q"),
    category: activeCategory,
    sort: readSort(params, "sort", SORTS, "newest"),
    page: readPage(params),
  };

  const categories = (await listCategories()).filter((category) => category.description !== "[DEMO] Category");

  const fields: FilterField[] = [
    { name: "q", label: "Search", type: "text", placeholder: "Vehicle name" },
    { name: "category", label: "Vehicle type", type: "select", options: categories.map((c) => ({ value: c.slug, label: c.name })) },
    { name: "sort", label: "Sort by", type: "select", options: [{ value: "newest", label: "Newest first" }, { value: "price_asc", label: "Price: low to high" }, { value: "price_desc", label: "Price: high to low" }] },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Autos cars"
        title="Explore car models"
        emphasis="for your next move."
        description="Browse real vehicle photography. These model references are not verified stock; ask the team to confirm a specific car's year, condition, price and availability."
      />

      <section className="shell pb-24 sm:pb-32">
        {!isSupabaseConfigured() && (
          <div className="mb-8">
            <DataModeNotice context="The autos catalogue reads from your database." />
          </div>
        )}

        {categories.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            <a href={`/autos/cars${buildQuery(params, { category: undefined, page: undefined })}`} className={cn("rounded-full border px-4 py-2 text-sm transition-colors", !activeCategory ? "border-forest bg-forest text-white" : "border-black/10 bg-white hover:bg-black/5")}>
              All vehicles
            </a>
            {categories.map((category) => (
              <a key={category.id} href={`/autos/cars${buildQuery(params, { category: category.slug, page: undefined })}`} className={cn("rounded-full border px-4 py-2 text-sm transition-colors", activeCategory === category.slug ? "border-forest bg-forest text-white" : "border-black/10 bg-white hover:bg-black/5")}>
                {category.name}
              </a>
            ))}
          </div>
        )}

        <FilterForm action="/autos/cars" fields={fields} values={{ q: filters.q, category: filters.category, sort: filters.sort === "newest" ? undefined : filters.sort }} />

        <Suspense fallback={<ResultsSkeleton columns={4} />}>
          <ProductResults filters={filters} params={params} />
        </Suspense>
      </section>
    </>
  );
}

async function ProductResults({ filters, params }: { filters: Parameters<typeof listProducts>[0]; params: RawSearchParams }) {
  const result = await listProducts(filters);

  if (result.items.length === 0) {
    const pastEnd = result.total > 0;
    return pastEnd ? (
      <EmptyState title="No cars on this page" description="That page is past the end of the results." action={{ href: "/autos/cars", label: "Back to the first page" }} />
    ) : (
      <EmptyState title="No cars match your search" description="Try a different category or tell us what you are looking for and we will help narrow the options." action={{ href: "/autos/contact", label: "Ask our team" }} />
    );
  }

  return (
    <>
      <p className="mb-6 text-sm text-black/50">Showing {result.items.length} of {result.total} vehicle{result.total === 1 ? "" : "s"}</p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {result.items.map((product, i) => (
          <div key={product.id} data-reveal style={{ transitionDelay: `${Math.min(i, 7) * 70}ms` }}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>
      <Pagination page={result.page} pageCount={result.pageCount} buildHref={(page) => `/autos/cars${buildQuery(params, { page: String(page) })}`} />
    </>
  );
}
