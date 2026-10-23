/**
 * The menus of the four public sections.
 *
 * Each part of the site is its own little world with its own menu — the rental
 * home menu, the real estate home menu, and so on — and the same list is needed
 * in two places: the floating navigation that still runs on the landing page,
 * and the sidebar that has replaced it everywhere else. Keeping one copy here
 * is what stops the two from drifting apart.
 *
 * This module is deliberately plain data plus two pure lookups. It is not
 * marked `server-only` because both consumers are client components.
 */

export interface SectionMenuLink {
  href: string;
  label: string;
}

export interface SectionMenu {
  /** The route the section lives under. Also its "home" page. */
  key: string;
  /** The heading this menu gets in the sidebar. */
  title: string;
  links: SectionMenuLink[];
}

export const SECTION_MENUS: SectionMenu[] = [
  {
    key: "/autos",
    title: "Autos",
    links: [
      { href: "/autos", label: "Home" },
      { href: "/autos/cars", label: "Cars" },
      { href: "/autos/about", label: "About" },
      { href: "/autos/faq", label: "FAQ" },
      { href: "/autos/contact", label: "Contact" },
    ],
  },
  {
    key: "/rental",
    title: "Car rental",
    links: [
      { href: "/rental", label: "Home" },
      { href: "/rental/cars", label: "Cars" },
      { href: "/rental/how-it-works", label: "How it works" },
      { href: "/rental/faq", label: "FAQ" },
      { href: "/rental/contact", label: "Contact" },
    ],
  },
  {
    key: "/shop",
    title: "Cars for sale",
    links: [
      { href: "/shop", label: "Home" },
      { href: "/shop/cars", label: "Cars" },
      { href: "/shop/buying-guide", label: "Buying guide" },
      { href: "/shop/faq", label: "FAQ" },
      { href: "/shop/contact", label: "Contact" },
    ],
  },
  {
    key: "/real-estate",
    title: "Real estate",
    links: [
      { href: "/real-estate", label: "Home" },
      { href: "/real-estate/properties", label: "Properties" },
      { href: "/real-estate/services", label: "Services" },
      { href: "/real-estate/faq", label: "FAQ" },
      { href: "/real-estate/contact", label: "Contact" },
    ],
  },
];

/**
 * The section a pathname belongs to.
 *
 * The root is "home" in the sense that src/app/page.tsx redirects it to /autos,
 * so it is folded into the autos section rather than being left sectionless.
 */
export function findSection(pathname: string): SectionMenu | null {
  if (pathname === "/") return SECTION_MENUS[0] ?? null;

  return (
    SECTION_MENUS.find(
      (section) => pathname === section.key || pathname.startsWith(`${section.key}/`),
    ) ?? null
  );
}

/** True on a section's own landing page — the "home page" of that section. */
export function isSectionHome(pathname: string): boolean {
  if (pathname === "/") return true;
  return SECTION_MENUS.some((section) => pathname === section.key);
}
