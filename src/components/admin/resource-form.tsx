"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Save, X } from "lucide-react";
import { MediaManager } from "@/components/admin/media-manager";
import { IDLE_RESULT, type ActionResult } from "@/lib/action-result";
import type { MediaRef } from "@/lib/types";
import { cn, slugify } from "@/lib/utils";

export type FieldDef =
  | { kind: "text"; name: string; label: string; placeholder?: string; half?: boolean; help?: string; slugFrom?: boolean }
  | { kind: "number"; name: string; label: string; placeholder?: string; half?: boolean; step?: string; help?: string }
  | { kind: "money"; name: string; label: string; placeholder?: string; half?: boolean; help?: string }
  | { kind: "textarea"; name: string; label: string; rows?: number; placeholder?: string; help?: string; half?: boolean }
  | {
      kind: "select";
      name: string;
      label: string;
      half?: boolean;
      options: { value: string; label: string }[];
      allowEmpty?: boolean;
    }
  | { kind: "switch"; name: string; label: string; help?: string }
  | { kind: "tags"; name: string; label: string; placeholder?: string; help?: string }
  | { kind: "media"; name: string; label: string; section: string; slugField: string };

export interface FormSection {
  title: string;
  description?: string;
  fields: FieldDef[];
}

export type FormValues = Record<string, unknown>;

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

export function ResourceForm({
  action,
  id,
  sections,
  initialValues,
  submitLabel,
  cancelHref,
}: {
  action: Action;
  id?: string;
  sections: FormSection[];
  initialValues: FormValues;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [slugTouched, setSlugTouched] = useState(Boolean(id));
  const [tagDraft, setTagDraft] = useState<Record<string, string>>({});
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message);
      router.refresh();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  const set = (name: string, value: unknown) => setValues((prev) => ({ ...prev, [name]: value }));

  const renderField = (field: FieldDef) => {
    const errors = state.errors?.[field.name];
    const hasError = Boolean(errors?.length);
    const value = values[field.name];

    if (field.kind === "media") {
      return (
        <div key={field.name} className="sm:col-span-2">
          <p className="field-label">{field.label}</p>
          <MediaManager
            value={(value as MediaRef[]) ?? []}
            onChange={(next) => set(field.name, next)}
            section={field.section}
            slug={String(values[field.slugField] ?? "")}
            error={errors?.join(" ")}
          />
        </div>
      );
    }

    if (field.kind === "tags") {
      const tags = (value as string[]) ?? [];
      const draft = tagDraft[field.name] ?? "";
      const commit = () => {
        const tag = draft.trim();
        if (!tag) return;
        if (!tags.includes(tag)) set(field.name, [...tags, tag]);
        setTagDraft((prev) => ({ ...prev, [field.name]: "" }));
      };
      return (
        <div key={field.name} className="sm:col-span-2">
          <label htmlFor={`f-${field.name}`} className="field-label">
            {field.label}
          </label>
          <div className="flex gap-2">
            <input
              id={`f-${field.name}`}
              value={draft}
              onChange={(event) => setTagDraft((prev) => ({ ...prev, [field.name]: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commit();
                }
              }}
              placeholder={field.placeholder ?? "Add an item and press Enter"}
              className="field py-2.5 text-sm"
            />
            <button type="button" onClick={commit} className="btn-ghost py-2.5">
              Add
            </button>
          </div>
          {tags.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <li
                  key={tag}
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs"
                >
                  {tag}
                  <button
                    type="button"
                    aria-label={`Remove ${tag}`}
                    onClick={() => set(field.name, tags.filter((t) => t !== tag))}
                    className="text-black/40 hover:text-red-600"
                  >
                    <X className="h-3 w-3" strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {field.help && <p className="mt-2 text-xs text-black/40">{field.help}</p>}
        </div>
      );
    }

    if (field.kind === "switch") {
      return (
        <label
          key={field.name}
          className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 bg-white p-4 sm:col-span-2"
        >
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => set(field.name, event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-black/20 text-forest focus:ring-forest"
          />
          <span>
            <span className="block text-sm font-medium">{field.label}</span>
            {field.help && <span className="mt-1 block text-xs text-black/40">{field.help}</span>}
          </span>
        </label>
      );
    }

    const common = cn("field", hasError && "border-red-500/60");

    return (
      <div key={field.name} className={cn(field.half ? "sm:col-span-1" : "sm:col-span-2")}>
        <label htmlFor={`f-${field.name}`} className="field-label">
          {field.label}
        </label>

        {field.kind === "select" ? (
          <select
            id={`f-${field.name}`}
            value={String(value ?? "")}
            onChange={(event) => set(field.name, event.target.value)}
            className={cn(common, "appearance-none")}
          >
            {field.allowEmpty && <option value="">—</option>}
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : field.kind === "textarea" ? (
          <textarea
            id={`f-${field.name}`}
            rows={field.rows ?? 5}
            value={String(value ?? "")}
            placeholder={field.placeholder}
            onChange={(event) => set(field.name, event.target.value)}
            className={cn(common, "resize-y")}
          />
        ) : (
          <input
            id={`f-${field.name}`}
            type={field.kind === "number" || field.kind === "money" ? "number" : "text"}
            inputMode={field.kind === "number" || field.kind === "money" ? "decimal" : undefined}
            step={field.kind === "money" ? "0.01" : field.kind === "number" ? field.step ?? "1" : undefined}
            value={value === null || value === undefined ? "" : String(value)}
            placeholder={field.placeholder}
            onChange={(event) => {
              const raw = event.target.value;
              if (field.kind === "text") {
                set(field.name, raw);
                if (field.name === "slug") setSlugTouched(true);
                if (field.slugFrom && !slugTouched) {
                  set("slug", slugify(raw));
                }
              } else {
                set(field.name, raw === "" ? "" : raw);
              }
            }}
            className={common}
          />
        )}

        {"help" in field && field.help && <p className="mt-2 text-xs text-black/40">{field.help}</p>}
        {hasError && <p className="mt-2 text-xs text-red-600">{errors?.join(" ")}</p>}
      </div>
    );
  };

  return (
    <form action={formAction} className="space-y-8">
      {id && <input type="hidden" name="id" value={id} />}
      <input type="hidden" name="payload" value={JSON.stringify(values)} />

      {sections.map((section) => (
        <section key={section.title} className="card-surface p-6">
          <div className="mb-6">
            <h2 className="font-display text-lg font-light tracking-tight">{section.title}</h2>
            {section.description && <p className="mt-1.5 text-sm text-black/50">{section.description}</p>}
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            {section.fields.map(renderField)}
          </div>
        </section>
      ))}

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-black/10 bg-white/95 p-4 backdrop-blur">
        <button type="submit" disabled={pending} className="btn-primary py-2.5 text-sm">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" strokeWidth={1.5} />}
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href={cancelHref} className="btn-ghost py-2.5 text-sm">
          Cancel
        </Link>
        {state.ok && <p className="text-xs text-forest">{state.message}</p>}
      </div>
    </form>
  );
}
