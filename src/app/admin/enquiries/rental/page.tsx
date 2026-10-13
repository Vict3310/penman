import { AdminFilterBar, AdminPageHeader } from "@/components/admin/ui";
import { EnquiryTable, type EnquiryRow } from "@/components/admin/enquiry-table";
import { adminListRentalEnquiries } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { readPage, readString, type RawSearchParams } from "@/lib/search-params";
import { ENQUIRY_STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = ENQUIRY_STATUSES.map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
}));

export default async function RentalEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const result = await adminListRentalEnquiries({
    q: readString(params, "q"),
    status: readString(params, "status"),
    page: readPage(params),
  });

  const rows: EnquiryRow[] = result.items.map((enquiry) => ({
    id: enquiry.id,
    title: enquiry.vehicle_name ?? "Vehicle enquiry",
    name: enquiry.name,
    phone: enquiry.phone,
    email: enquiry.email,
    message: enquiry.message,
    status: enquiry.status,
    internal_notes: enquiry.internal_notes,
    created_at: enquiry.created_at,
    meta: [
      { label: "Pickup", value: formatDate(enquiry.pickup_date) },
      { label: "Return", value: formatDate(enquiry.return_date) },
    ],
  }));

  return (
    <>
      <AdminPageHeader
        title="Rental enquiries"
        description="Review hire requests and confirm them with the customer. Nothing is confirmed automatically."
      />

      <AdminFilterBar
        action="/admin/enquiries/rental"
        query={readString(params, "q")}
        status={readString(params, "status")}
        placeholder="Search by name, phone or vehicle…"
        statusOptions={STATUS_OPTIONS}
      />

      <p className="mb-4 text-xs text-black/40">
        {result.total} enquir{result.total === 1 ? "y" : "ies"}
        {result.pageCount > 1 ? ` · page ${result.page} of ${result.pageCount}` : ""}
      </p>

      <EnquiryTable
        rows={rows}
        table="rental_enquiries"
        statusOptions={STATUS_OPTIONS}
        emptyTitle="No rental enquiries yet"
        emptyDescription="When a visitor submits a rental enquiry it will appear here for you to review and confirm."
      />
    </>
  );
}
