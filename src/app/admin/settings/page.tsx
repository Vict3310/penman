import { AdminPageHeader } from "@/components/admin/ui";
import { getSiteSettings } from "@/lib/site";
import { SettingsSectionForm, type SettingsField } from "./settings-form";

export const dynamic = "force-dynamic";

const BRAND: SettingsField[] = [
  { name: "business_name", label: "Business name", type: "text", half: true },
  { name: "tagline", label: "Tagline", type: "text", half: true },
  { name: "logo_url", label: "Logo URL", type: "url", half: true, help: "Optional. Leave blank to use the built-in mark." },
];

const CONTACT: SettingsField[] = [
  { name: "phone", label: "Phone number", type: "tel", half: true, placeholder: "+234…" },
  { name: "whatsapp", label: "WhatsApp number", type: "tel", half: true, help: "Digits with country code, e.g. 2348012345678." },
  { name: "email", label: "Business email", type: "email", half: true },
  { name: "hours", label: "Opening hours", type: "text", half: true, placeholder: "Mon–Sat, 9am–6pm" },
  { name: "address", label: "Business address", type: "textarea" },
];

const SOCIAL: SettingsField[] = [
  { name: "instagram", label: "Instagram URL", type: "url", half: true },
  { name: "tiktok", label: "TikTok URL", type: "url", half: true },
  { name: "facebook", label: "Facebook URL", type: "url", half: true },
  { name: "x", label: "X (Twitter) URL", type: "url", half: true },
  { name: "linkedin", label: "LinkedIn URL", type: "url", half: true },
];

const HERO: SettingsField[] = [
  { name: "eyebrow", label: "Eyebrow line", type: "text" },
  { name: "heading", label: "Headline", type: "text" },
  { name: "heading_emphasis", label: "Headline emphasis", type: "text", help: "Rendered in italic serif after the headline." },
  { name: "subheading", label: "Supporting text", type: "textarea" },
  { name: "primary_cta_label", label: "Primary button label", type: "text", half: true },
  { name: "primary_cta_href", label: "Primary button link", type: "text", half: true, help: "e.g. /rental" },
];

const ABOUT: SettingsField[] = [
  { name: "heading", label: "About heading", type: "text" },
  { name: "body", label: "About text", type: "textarea" },
];

const FOOTER: SettingsField[] = [{ name: "note", label: "Footer note", type: "textarea" }];

const SEO: SettingsField[] = [
  { name: "default_title", label: "Default page title", type: "text" },
  { name: "default_description", label: "Default meta description", type: "textarea" },
  { name: "keywords", label: "Keywords", type: "text", help: "Comma separated. Optional." },
];

export default async function SettingsPage() {
  const settings = await getSiteSettings();

  /** Settings objects are plain JSON records; widen them for the form. */
  const asRecord = (value: object) => value as unknown as Record<string, unknown>;

  const sections: {
    title: string;
    description: string;
    key: "brand" | "contact" | "social" | "hero" | "about" | "footer" | "seo";
    fields: SettingsField[];
    values: Record<string, unknown>;
  }[] = [
    { title: "Business identity", description: "The name and tagline used across the site.", key: "brand", fields: BRAND, values: asRecord(settings.brand) },
    { title: "Contact details", description: "Shown in the footer, on the contact page and in WhatsApp links.", key: "contact", fields: CONTACT, values: asRecord(settings.contact) },
    { title: "Social links", description: "Only links you fill in are displayed.", key: "social", fields: SOCIAL, values: asRecord(settings.social) },
    { title: "Homepage hero", description: "The headline block at the top of the homepage.", key: "hero", fields: HERO, values: asRecord(settings.hero) },
    { title: "About section", description: "Used on the homepage and the about page.", key: "about", fields: ABOUT, values: asRecord(settings.about) },
    { title: "Footer", description: "A short note in the site footer.", key: "footer", fields: FOOTER, values: asRecord(settings.footer) },
    { title: "Default SEO", description: "Fallback metadata for pages without their own.", key: "seo", fields: SEO, values: asRecord(settings.seo) },
  ];

  return (
    <>
      <AdminPageHeader
        title="Site settings"
        description="Business details and homepage content. Changes appear on the public site immediately — no code changes required."
      />

      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.key} className="card-surface p-6">
            <div className="mb-6">
              <h2 className="font-display text-lg font-light tracking-tight">{section.title}</h2>
              <p className="mt-1.5 text-sm text-black/50">{section.description}</p>
            </div>
            <SettingsSectionForm sectionKey={section.key} fields={section.fields} values={section.values} />
          </section>
        ))}
      </div>
    </>
  );
}
