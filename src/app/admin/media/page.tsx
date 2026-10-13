import Image from "next/image";
import Link from "next/link";
import { Download, UploadCloud } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";
import { DEMO_PRODUCTS, DEMO_PROPERTIES, DEMO_VEHICLES } from "@/lib/demo-data";

const media = [...DEMO_VEHICLES, ...DEMO_PROPERTIES, ...DEMO_PRODUCTS]
  .flatMap((record) => {
    const title = "name" in record ? record.name : record.title;
    return record.images.map((image, index) => ({
      id: `${record.id}-${index}`,
      title,
      url: image.url,
      alt: image.alt ?? title ?? "Listing image",
      kind: "Image",
    }));
  })
  .slice(0, 12);

export default function MediaPage() {
  return (
    <>
      <AdminPageHeader
        title="Media library"
        description="Uploaded visuals for rentals, properties, and products."
        action={{ href: "/admin/vehicles/new", label: "Upload media" }}
      />

      <section className="mb-6 rounded-[22px] border border-dashed border-black/20 bg-white p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-black/40">Storage</p>
            <p className="mt-2 font-display text-2xl tracking-tight">Media bucket is ready</p>
          </div>
          <button type="button" className="btn-primary gap-2 py-2.5 text-sm">
            <UploadCloud className="h-4 w-4" strokeWidth={1.5} />
            Add files
          </button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {media.map((item) => (
          <div key={item.id} className="card-surface overflow-hidden">
            <div className="relative h-52 w-full overflow-hidden bg-slate-100">
              <Image src={item.url} alt={item.alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-xs text-black/40">{item.kind}</p>
                </div>
                <button type="button" className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700">
                  <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Copy URL
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-black/35">
                <span>Ready</span>
                <Link href="/admin/vehicles" className="text-slate-700">Linked to listings</Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
