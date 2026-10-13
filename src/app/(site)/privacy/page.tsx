import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { getSiteSettings } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Penman Empire collects, uses and protects the information you provide through this website.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const settings = await getSiteSettings();
  const { brand, contact } = settings;

  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Privacy"
        emphasis="policy."
        description="This policy explains what we collect when you use this website and how we handle it."
      />

      <section className="shell pb-24 sm:pb-32">
        <div className="card-surface max-w-3xl space-y-8 p-8 sm:p-10">
          <div>
            <h2 className="font-display text-xl font-light tracking-tight">Information we collect</h2>
            <p className="mt-3 text-base leading-relaxed text-black/60">
              When you submit an enquiry form on this website we collect the details you enter — typically your name,
              phone number, optionally your email address, and the details of your request (such as rental dates, a
              property you are interested in, or a product you would like to order).
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-light tracking-tight">How we use it</h2>
            <p className="mt-3 text-base leading-relaxed text-black/60">
              We use your information solely to respond to your enquiry and to administer any resulting arrangement.
              We do not sell your personal information.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-light tracking-tight">Where it is stored</h2>
            <p className="mt-3 text-base leading-relaxed text-black/60">
              Enquiries are stored in our secured database. Access is restricted to authorised staff through a
              protected administration area, and the underlying data is protected by access-control policies that
              prevent public access.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-light tracking-tight">Third-party services</h2>
            <p className="mt-3 text-base leading-relaxed text-black/60">
              This website uses a hosting provider to serve pages and a managed database provider to store data.
              Images may be served from the same managed storage. If you choose to contact us through WhatsApp, your
              message is handled under WhatsApp&apos;s own privacy terms.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-light tracking-tight">Your rights</h2>
            <p className="mt-3 text-base leading-relaxed text-black/60">
              You may ask us to access, correct or delete the information you have provided. To do so, contact us
              using the details below. We may need to verify your identity before acting on a request.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-light tracking-tight">Contact</h2>
            <p className="mt-3 text-base leading-relaxed text-black/60">
              {brand.business_name}
              {contact.email ? (
                <>
                  {" — "}
                  <a href={`mailto:${contact.email}`} className="text-forest hover:underline">
                    {contact.email}
                  </a>
                </>
              ) : null}
              {contact.phone ? (
                <>
                  {" — "}
                  <a href={`tel:${contact.phone}`} className="text-forest hover:underline">
                    {contact.phone}
                  </a>
                </>
              ) : null}
            </p>
          </div>

          <p className="border-t border-black/10 pt-6 text-xs text-black/40">
            This policy is provided as a plain-language baseline. The business owner should have it reviewed to
            confirm it satisfies all applicable local requirements before relying on it.
          </p>
        </div>
      </section>
    </>
  );
}
