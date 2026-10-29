import Image from "next/image";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/ui";
import { getAdminClient } from "@/lib/supabase/admin";
import { isVideoMedia, type MediaRef } from "@/lib/types";

export const dynamic = "force-dynamic";

interface LibraryItem {
  id: string;
  title: string;
  editHref: string;
  media: MediaRef;
}

async function listingMedia(): Promise<LibraryItem[]> {
  const supabase = getAdminClient();
  const [vehicles, properties, products] = await Promise.all([
    supabase.from("vehicles").select("id, name, images").order("updated_at", { ascending: false }).limit(100),
    supabase.from("properties").select("id, title, images").order("updated_at", { ascending: false }).limit(100),
    supabase.from("products").select("id, name, images").order("updated_at", { ascending: false }).limit(100),
  ]);

  return [
    ...(vehicles.data ?? []).map((item) => ({ ...item, title: item.name, route: "vehicles" })),
    ...(properties.data ?? []).map((item) => ({ ...item, title: item.title, route: "properties" })),
    ...(products.data ?? []).map((item) => ({ ...item, title: item.name, route: "products" })),
  ].flatMap((item) =>
    ((item.images as MediaRef[] | null) ?? []).map((media, index) => ({
      id: `${item.route}-${item.id}-${index}`,
      title: item.title,
      editHref: `/admin/${item.route}/${item.id}`,
      media,
    })),
  );
}

export default async function MediaPage() {
  const media = await listingMedia();

  return (
    <>
      <AdminPageHeader
        title="Media library"
        description="Photos and videos attached to your listings. Open a listing to upload or reorder its media."
        action={{ href: "/admin/products/new", label: "New car post" }}
      />

      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        <Link href="/admin/vehicles/new" className="btn-ghost py-2.5">Add rental vehicle</Link>
        <Link href="/admin/properties/new" className="btn-ghost py-2.5">Add property</Link>
        <Link href="/admin/products/new" className="btn-ghost py-2.5">Add shop car or product</Link>
      </div>

      {media.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-black/15 p-8 text-sm text-black/50">
          No media is attached to a listing yet. Create or edit a listing to add photos and video.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {media.map((item) => (
            <div key={item.id} className="card-surface overflow-hidden">
              <div className="relative h-52 w-full overflow-hidden bg-sage">
                {isVideoMedia(item.media) ? (
                  <video src={item.media.url} controls muted playsInline preload="metadata" className="h-full w-full object-cover" />
                ) : (
                  <Image src={item.media.url} alt={item.media.alt || item.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                )}
              </div>
              <div className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium text-ink">{item.title}</p>
                  <p className="mt-0.5 text-xs text-black/40">{isVideoMedia(item.media) ? "Video" : "Photo"}</p>
                </div>
                <Link href={item.editHref} className="text-xs font-medium text-forest underline">Edit post</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
