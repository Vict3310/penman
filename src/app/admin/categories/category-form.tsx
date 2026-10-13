"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { saveCategory } from "@/app/actions/admin";
import { IDLE_RESULT } from "@/lib/action-result";
import type { ProductCategory } from "@/lib/types";
import { slugify } from "@/lib/utils";

export function ProductCategoryForm({ category }: { category?: ProductCategory }) {
  const [state, formAction, pending] = useActionState(saveCategory, IDLE_RESULT);
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(category));
  const [position, setPosition] = useState(String(category?.position ?? 0));
  const [description, setDescription] = useState(category?.description ?? "");
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message);
      if (!category) {
        setName("");
        setSlug("");
        setDescription("");
        setPosition("0");
        setSlugTouched(false);
      }
      router.refresh();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router, category]);

  const payload = {
    name,
    slug,
    description,
    position,
  };

  return (
    <form action={formAction} className="space-y-4">
      {category && <input type="hidden" name="id" value={category.id} />}
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      <div>
        <label htmlFor="cat-name" className="field-label">
          Name
        </label>
        <input
          id="cat-name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (!slugTouched) setSlug(slugify(event.target.value));
          }}
          className="field py-2.5 text-sm"
          placeholder="e.g. Car Care"
          required
        />
        {state.errors?.name && <p className="mt-2 text-xs text-red-600">{state.errors.name.join(" ")}</p>}
      </div>

      <div>
        <label htmlFor="cat-slug" className="field-label">
          Slug
        </label>
        <input
          id="cat-slug"
          value={slug}
          onChange={(event) => {
            setSlug(event.target.value);
            setSlugTouched(true);
          }}
          className="field py-2.5 text-sm"
          placeholder="car-care"
          required
        />
        {state.errors?.slug && <p className="mt-2 text-xs text-red-600">{state.errors.slug.join(" ")}</p>}
      </div>

      <div>
        <label htmlFor="cat-description" className="field-label">
          Description (optional)
        </label>
        <textarea
          id="cat-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          className="field resize-y py-2.5 text-sm"
        />
      </div>

      <div>
        <label htmlFor="cat-position" className="field-label">
          Display order
        </label>
        <input
          id="cat-position"
          type="number"
          value={position}
          onChange={(event) => setPosition(event.target.value)}
          className="field py-2.5 text-sm"
        />
      </div>

      <button type="submit" disabled={pending} className="btn-primary w-full py-2.5 text-sm">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" strokeWidth={1.5} />}
        {pending ? "Saving…" : category ? "Save category" : "Create category"}
      </button>
    </form>
  );
}
