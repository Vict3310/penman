import { cache } from "react";
import { getPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/env";
import { isDemoMode } from "@/lib/demo";
import { DEMO_SETTINGS } from "@/lib/demo-data";

/**
 * Editable site content. Everything here is stored in `site_settings` and is
 * editable from /admin/settings — no code changes required.
 */

export interface BrandSettings {
  business_name: string;
  tagline: string;
  logo_url: string | null;
}

export interface ContactSettings {
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  hours: string;
}

export interface SocialSettings {
  instagram: string;
  facebook: string;
  x: string;
  linkedin: string | null;
}

export interface HeroSettings {
  eyebrow: string;
  heading: string;
  heading_emphasis: string;
  subheading: string;
  primary_cta_label: string;
  primary_cta_href: string;
}

export interface AboutSettings {
  heading: string;
  body: string;
}

export interface FooterSettings {
  note: string;
}

export interface SeoSettings {
  default_title: string;
  default_description: string;
  keywords: string;
}

export interface SiteSettings {
  brand: BrandSettings;
  contact: ContactSettings;
  social: SocialSettings;
  hero: HeroSettings;
  about: AboutSettings;
  footer: FooterSettings;
  seo: SeoSettings;
}

/**
 * Sensible structural defaults. These are intentionally free of invented
 * business facts — contact details are left blank so the owner must supply
 * genuine information rather than shipping placeholders to production.
 */
export const DEFAULT_SETTINGS: SiteSettings = {
  brand: {
    business_name: "Penman Empire",
    tagline: "Automobiles. Real estate. Cars for sale.",
    logo_url: null,
  },
  contact: {
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    hours: "",
  },
  social: { instagram: "", facebook: "", x: "", linkedin: null },
  hero: {
    eyebrow: "Penman Empire — one brand, three businesses",
    heading: "Cars, property and rental",
    heading_emphasis: "solutions under one roof.",
    subheading:
      "Find a rental, discover a vehicle to buy, or browse a property with the same trusted team handling every step.",
    primary_cta_label: "Explore vehicles",
    primary_cta_href: "/rental",
  },
  about: {
    heading: "Built on trust",
    body:
      "Penman Empire operates across automobile rental, vehicle sales and real estate. We keep the same standard across all three: clear pricing, honest communication and dependable service.",
  },
  footer: { note: "" },
  seo: {
    default_title: "Penman Empire — Car Rental, Car Sales & Real Estate",
    default_description:
      "Penman Empire offers vehicle rentals, cars for sale and real estate listings from one trusted brand.",
    keywords: "",
  },
};

type Row = { key: string; value: unknown };

function mergeSection<T extends object>(defaults: T, value: unknown): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaults;
  return { ...defaults, ...(value as Partial<T>) };
}

/** Read all settings in a single query. Cached per request. */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  // In demo mode show the full layout — including the contact and WhatsApp
  // CTAs — using clearly fake `.example` details.
  if (isDemoMode()) return DEMO_SETTINGS;
  if (!isSupabaseConfigured()) return DEFAULT_SETTINGS;

  try {
    const supabase = getPublicClient();
    const { data, error } = await supabase.from("site_settings").select("key, value");
    if (error || !data) return DEFAULT_SETTINGS;

    const map = new Map((data as Row[]).map((r) => [r.key, r.value]));
    return {
      brand: mergeSection(DEFAULT_SETTINGS.brand, map.get("brand")),
      contact: mergeSection(DEFAULT_SETTINGS.contact, map.get("contact")),
      social: mergeSection(DEFAULT_SETTINGS.social, map.get("social")),
      hero: mergeSection(DEFAULT_SETTINGS.hero, map.get("hero")),
      about: mergeSection(DEFAULT_SETTINGS.about, map.get("about")),
      footer: mergeSection(DEFAULT_SETTINGS.footer, map.get("footer")),
      seo: mergeSection(DEFAULT_SETTINGS.seo, map.get("seo")),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
});
