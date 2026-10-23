import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Hash } from "lucide-react";

import { StatusBadge } from "@/components/ui/misc";
import { enquiryReference, type AccountEnquiry } from "@/lib/account/queries";
import { formatDate } from "@/lib/utils";

/**
 * One enquiry, as the customer submitted it.
 *
 * The card shows only what the customer already knows: what they asked about,
 * when, the details they typed, the current status and the reference. No
 * internal notes, no assignee, no pipeline state — those live in the
 * administration area behind its own authorization.
 *
 * On small screens the layout stacks; from `sm` the thumbnail sits beside the
 * text. Nothing is fixed width, so the card holds together down to 320px.
 */
export function EnquiryCard({ enquiry }: { enquiry: AccountEnquiry }) {
  const reference = enquiryReference(enquiry.id);

  return (
    <article className="card-surface overflow-hidden">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:gap-5">
        <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-xl bg-sage/50 sm:h-20 sm:w-28">
          {enquiry.image?.url ? (
            <Image
              src={enquiry.image.url}
              alt={enquiry.subject}
              fill
              sizes="(max-width: 640px) 100vw, 112px"
              className="object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center px-2 text-center text-[10px] uppercase tracking-[0.2em] text-forest/45">
              {enquiry.kindLabel}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="card-badge card-badge-neutral">{enquiry.kindLabel}</span>
            <StatusBadge status={enquiry.status} />
          </div>

          <h3 className="mt-3 font-display text-lg font-light tracking-tight text-ink">
            {enquiry.href ? (
              <Link
                href={enquiry.href}
                className="underline decoration-black/15 underline-offset-4 transition-colors hover:decoration-forest"
              >
                {enquiry.subject}
              </Link>
            ) : (
              // Saved by the customer, since removed or unpublished by us. It
              // is shown rather than hidden: silently dropping it would look
              // like the enquiry itself had been lost.
              <span>
                {enquiry.subject}
                <span className="ml-2 text-sm text-black/45">(no longer listed)</span>
              </span>
            )}
          </h3>

          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-black/50">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-forest" strokeWidth={1.5} />
              <dt className="sr-only">Submitted</dt>
              <dd>{formatDate(enquiry.createdAt)}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-forest" strokeWidth={1.5} />
              <dt className="sr-only">Reference</dt>
              <dd className="font-mono text-[11px] tracking-wide">{reference}</dd>
            </div>
            {enquiry.details.map((line) => (
              <div key={line.label} className="flex items-center gap-1.5">
                <dt className="uppercase tracking-widest text-black/40">{line.label}</dt>
                <dd>{line.value}</dd>
              </div>
            ))}
          </dl>

          {enquiry.message && (
            <p className="mt-4 whitespace-pre-line rounded-xl bg-black/[0.025] p-3.5 text-sm leading-relaxed text-black/65">
              {enquiry.message}
            </p>
          )}

          {enquiry.href && (
            <Link
              href={enquiry.href}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-forest underline decoration-forest/30 underline-offset-4 transition-colors hover:decoration-forest"
            >
              View the listing
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
