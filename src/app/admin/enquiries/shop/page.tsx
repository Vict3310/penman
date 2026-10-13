import { AdminFilterBar, AdminPageHeader } from "@/components/admin/ui";
import { EnquiryTable, type EnquiryRow } from "@/components/admin/enquiry-table";
import { adminListShopEnquiries } from "@/lib/queries";
import { readPage, readString, type RawSearchParams } from "@/lib/search-params";
import { SHOP_ENQUIRY_STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = SHOP_ENQUIRY_STATUSES.map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
}));

export default async function ShopEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const result = await adminListShopEnquiries({
    q: readString(params, "q"),
    status: readString(params, "status"),
    page: readPage(params),
  });

  const rows: EnquiryRow[] = result.items.map((enquiry) => ({
    id: enquiry.id,
    title: enquiry.product_name ?? "Vehicle enquiry",
    name: enquiry.name,
    phone: enquiry.phone,
    email: enquiry.email,
    message: enquiry.message,
    status: enquiry.status,
    internal_notes: enquiry.internal_notes,
    created_at: enquiry.created_at,
    meta: [
      { label: "Quantity", value: String(enquiry.quantity) },
      { label: "Channel", value: enquiry.channel === "whatsapp" ? "WhatsApp" : "Website form" },
    ],
  }));

  return (
    <>
      <AdminPageHeader
        title="Vehicle sales enquiries"
        description="Buyer enquiries from the vehicle marketplace. Confirm the vehicle, pricing and next steps with the customer."
      />

      <AdminFilterBar
        action="/admin/enquiries/shop"
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
        table="shop_enquiries"
        statusOptions={STATUS_OPTIONS}
        emptyTitle="No sales enquiries yet"
        emptyDescription="Buyer enquiries submitted from the vehicle marketplace will appear here."
      />
    </>
  );
}
