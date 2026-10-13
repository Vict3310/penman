import { AdminFilterBar, AdminPageHeader } from "@/components/admin/ui";
import { EnquiryTable, type EnquiryRow } from "@/components/admin/enquiry-table";
import { adminListPropertyEnquiries } from "@/lib/queries";
import { readPage, readString, type RawSearchParams } from "@/lib/search-params";
import { ENQUIRY_STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = ENQUIRY_STATUSES.map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
}));

export default async function PropertyEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const result = await adminListPropertyEnquiries({
    q: readString(params, "q"),
    status: readString(params, "status"),
    page: readPage(params),
  });

  const rows: EnquiryRow[] = result.items.map((enquiry) => ({
    id: enquiry.id,
    title: enquiry.property_title ?? "Property enquiry",
    name: enquiry.name,
    phone: enquiry.phone,
    email: enquiry.email,
    message: enquiry.message,
    status: enquiry.status,
    internal_notes: enquiry.internal_notes,
    created_at: enquiry.created_at,
    meta: [],
  }));

  return (
    <>
      <AdminPageHeader
        title="Property enquiries"
        description="Viewing requests and questions about your listings."
      />

      <AdminFilterBar
        action="/admin/enquiries/property"
        query={readString(params, "q")}
        status={readString(params, "status")}
        placeholder="Search by name, phone or property…"
        statusOptions={STATUS_OPTIONS}
      />

      <p className="mb-4 text-xs text-black/40">
        {result.total} enquir{result.total === 1 ? "y" : "ies"}
        {result.pageCount > 1 ? ` · page ${result.page} of ${result.pageCount}` : ""}
      </p>

      <EnquiryTable
        rows={rows}
        table="property_enquiries"
        statusOptions={STATUS_OPTIONS}
        emptyTitle="No property enquiries yet"
        emptyDescription="Enquiries submitted from a property page will appear here."
      />
    </>
  );
}
