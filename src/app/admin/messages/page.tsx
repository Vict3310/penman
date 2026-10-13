import { AdminFilterBar, AdminPageHeader } from "@/components/admin/ui";
import { EnquiryTable, type EnquiryRow } from "@/components/admin/enquiry-table";
import { adminListContactMessages } from "@/lib/queries";
import { readPage, readString, type RawSearchParams } from "@/lib/search-params";
import { ENQUIRY_STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = ENQUIRY_STATUSES.map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
}));

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const result = await adminListContactMessages({
    q: readString(params, "q"),
    status: readString(params, "status"),
    page: readPage(params),
  });

  const rows: EnquiryRow[] = result.items.map((message) => ({
    id: message.id,
    title: message.subject,
    name: message.name,
    phone: message.phone,
    email: message.email,
    message: message.message,
    status: message.status,
    internal_notes: message.internal_notes,
    created_at: message.created_at,
    meta: [],
  }));

  return (
    <>
      <AdminPageHeader
        title="Messages"
        description="General enquiries submitted through the contact page."
      />

      <AdminFilterBar
        action="/admin/messages"
        query={readString(params, "q")}
        status={readString(params, "status")}
        placeholder="Search by name, phone or subject…"
        statusOptions={STATUS_OPTIONS}
      />

      <p className="mb-4 text-xs text-black/40">
        {result.total} message{result.total === 1 ? "" : "s"}
        {result.pageCount > 1 ? ` · page ${result.page} of ${result.pageCount}` : ""}
      </p>

      <EnquiryTable
        rows={rows}
        table="contact_messages"
        statusOptions={STATUS_OPTIONS}
        emptyTitle="No messages yet"
        emptyDescription="Messages sent through the contact page will appear here."
      />
    </>
  );
}
