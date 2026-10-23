import Link from "next/link";

import { AccountPageHeader, Panel } from "@/components/account/account-ui";
import { RemoveSavedButton } from "@/components/account/forms";
import { PropertyCard, ProductCard, VehicleCard } from "@/components/cards";
import { EmptyState } from "@/components/ui/misc";
import { getSavedListings } from "@/lib/account/queries";
import { requireCustomer } from "@/lib/account/session";
import { formatCurrency } from "@/lib/utils";
import type { Product, Property, SavedKind, Vehicle } from "@/lib/types";

/** One saved listing, of whichever type. */
type SavedItem = Vehicle | Product | Property;

interface SavedSection {
  key: SavedKind;
  title: string;
  description: string;
  href: string;
  published: SavedItem[];
  withdrawn: SavedItem[];
  render: (item: SavedItem) => React.ReactNode;
  label: (item: SavedItem) => string;
  meta: (item: SavedItem) => string;
}

/**
 * Everything this customer has saved.
 *
 * Three sections rather than one mixed list, because the three listings mean
 * different things: a vehicle to hire, a car to buy, a property. Within each,
 * published listings render as the same card the rest of the site uses — so
 * the bookmark that saved them also removes them — and anything we have since
 * withdrawn renders as a plain row under "No longer listed", with the remove
 * control still working.
 *
 * That second case is the one worth getting right. A saved listing that has
 * been archived or unpublished must not vanish silently: the customer would
 * reasonably conclude the account lost it. It stays visible, clearly marked,
 * and disposable.
 */
export default async function AccountSavedPage() {
  const user = await requireCustomer("/account/saved");
  const saved = await getSavedListings(user.id);

  const total = saved.vehicles.length + saved.products.length + saved.properties.length;

  if (total === 0) {
    return (
      <>
        <AccountPageHeader
          eyebrow="My account"
          title="Saved vehicles"
          description="Keep the cars and properties you are considering in one place."
        />
        <EmptyState
          title="Nothing saved yet"
          description="Tap the bookmark on any listing and it will be kept here, on your account, across every device you sign in from."
          action={{ href: "/rental/cars", label: "Explore vehicles" }}
        />
      </>
    );
  }

  const isPublished = (item: SavedItem) => item.status === "published";

  // Explicitly typed rather than inferred. Three differently-typed arrays in
  // one literal make TypeScript intersect the render signatures until they
  // collapse to `never`, which is a type error rather than a real hazard —
  // but the declared shape states the intent, and the per-section cast is
  // justified by the foreign key that guarantees each table's row type.
  const sections: SavedSection[] = [
    {
      key: "vehicle",
      title: "Vehicles for hire",
      description: "From the rental fleet.",
      href: "/rental/cars",
      published: saved.vehicles.filter(isPublished),
      withdrawn: saved.vehicles.filter((item) => !isPublished(item)),
      render: (item) => <VehicleCard key={item.id} vehicle={item as Vehicle} />,
      label: (item) => (item as Vehicle).name,
      meta: (item) => formatCurrency((item as Vehicle).rate, (item as Vehicle).currency),
    },
    {
      key: "product",
      title: "Cars for sale",
      description: "From the marketplace.",
      href: "/shop/cars",
      published: saved.products.filter(isPublished),
      withdrawn: saved.products.filter((item) => !isPublished(item)),
      render: (item) => <ProductCard key={item.id} product={item as Product} />,
      label: (item) => (item as Product).name,
      meta: (item) => formatCurrency((item as Product).price, (item as Product).currency),
    },
    {
      key: "property",
      title: "Properties",
      description: "From the real-estate listings.",
      href: "/real-estate/properties",
      published: saved.properties.filter(isPublished),
      withdrawn: saved.properties.filter((item) => !isPublished(item)),
      render: (item) => <PropertyCard key={item.id} property={item as Property} />,
      label: (item) => (item as Property).title,
      meta: (item) => (item as Property).location,
    },
  ];

  return (
    <>
      <AccountPageHeader
        eyebrow="My account"
        title="Saved vehicles"
        description={`${total} ${total === 1 ? "listing" : "listings"} saved to your account.`}
        action={{ href: "/rental/cars", label: "Browse more" }}
      />

      <div className="space-y-8">
        {sections.map((section) => {
          const count = section.published.length + section.withdrawn.length;
          if (count === 0) return null;

          return (
            <section key={section.key} aria-labelledby={`saved-${section.key}-heading`}>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2
                    id={`saved-${section.key}-heading`}
                    className="font-display text-xl font-light tracking-tight text-ink"
                  >
                    {section.title}
                  </h2>
                  <p className="mt-1 text-sm text-black/50">{section.description}</p>
                </div>
                <Link
                  href={section.href}
                  className="text-sm font-medium text-forest underline decoration-forest/30 underline-offset-4 transition-colors hover:decoration-forest"
                >
                  See all
                </Link>
              </div>

              {section.published.length > 0 && (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {section.published.map((item) => section.render(item))}
                </div>
              )}

              {section.withdrawn.length > 0 && (
                <Panel
                  className={section.published.length > 0 ? "mt-5" : undefined}
                  title="No longer listed"
                  description="We have taken these off the site. They are still shown here so nothing disappears without you noticing."
                >
                  <ul className="divide-y divide-black/5">
                    {section.withdrawn.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-black/60 line-through decoration-black/25">
                            {section.label(item)}
                          </p>
                          <p className="text-xs text-black/40">{section.meta(item)}</p>
                        </div>
                        <RemoveSavedButton
                          kind={section.key}
                          listingId={item.id}
                          title={section.label(item)}
                        />
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
