import Link from "next/link";
import { Info } from "lucide-react";

import { AccountPageHeader, Panel } from "@/components/account/account-ui";
import { EnquiryCard } from "@/components/account/enquiry-card";
import { EmptyState } from "@/components/ui/misc";
import { getMyEnquiries } from "@/lib/account/queries";
import { requireCustomer } from "@/lib/account/session";

/**
 * The customer's own enquiries.
 *
 * Data isolation is enforced here by construction: the query takes the id that
 * `requireCustomer()` resolved from the session cookie and filters on it. No
 * identifier from the URL, the query string or a form reaches that call, so
 * there is no request a visitor could craft that returns another customer's
 * rows.
 *
 * The status shown is the business's own vocabulary for an enquiry, and the
 * page says so plainly. A status of "confirmed" means the team confirmed the
 * enquiry, not that a vehicle is booked — claiming otherwise would turn a
 * record of interest into a promise the workflow never made.
 */
export default async function AccountEnquiriesPage() {
  const user = await requireCustomer("/account/enquiries");
  const enquiries = await getMyEnquiries(user.id);

  return (
    <>
      <AccountPageHeader
        eyebrow="My account"
        title="My enquiries"
        description="Every request you have sent us, newest first."
        action={{ href: "/rental/cars", label: "Browse cars" }}
      />

      {enquiries.length === 0 ? (
        <EmptyState
          title="No enquiries yet"
          description="When you ask about a vehicle, a property or a car for sale, it will appear here with its reference number and current status."
          action={{ href: "/rental/cars", label: "Browse available cars" }}
        />
      ) : (
        <>
          <div className="space-y-4">
            {enquiries.map((enquiry) => (
              <EnquiryCard key={enquiry.id} enquiry={enquiry} />
            ))}
          </div>

          <Panel className="mt-6">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-forest" strokeWidth={1.5} />
              <p className="text-xs leading-relaxed text-black/55">
                A status here tracks how far our team has got with your enquiry — it is not a
                booking confirmation until we have spoken with you. Quote the reference number and
                we can find your enquiry immediately. Enquiries are kept on your account from the
                moment you are signed in; anything you sent before creating an account stays in our
                inbox and is not shown here.
              </p>
            </div>
          </Panel>
        </>
      )}

      {enquiries.length > 0 && (
        <p className="mt-6 text-center text-xs text-black/45">
          Looking for something else?{" "}
          <Link href="/account/saved" className="underline decoration-black/20 underline-offset-4 hover:text-ink">
            See your saved vehicles
          </Link>
        </p>
      )}
    </>
  );
}
