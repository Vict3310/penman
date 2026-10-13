"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { saveSettingsSection } from "@/app/actions/admin";
import { IDLE_RESULT } from "@/lib/action-result";

export interface SettingsField {
  name: string;
  label: string;
  type: "text" | "textarea" | "email" | "tel" | "url";
  placeholder?: string;
  help?: string;
  half?: boolean;
}

export function SettingsSectionForm({
  sectionKey,
  fields,
  values,
}: {
  sectionKey: "brand" | "contact" | "social" | "hero" | "about" | "footer" | "seo";
  fields: SettingsField[];
  values: Record<string, unknown>;
}) {
  const [state, formAction, pending] = useActionState(saveSettingsSection, IDLE_RESULT);

  useEffect(() => {
    if (state.ok) toast.success(state.message);
    else if (state.message) toast.error(state.message);
  }, [state]);

  const payload = {
    key: sectionKey,
    value: Object.fromEntries(fields.map((field) => [field.name, values[field.name] ?? ""])),
  };

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.name} className={field.half ? "sm:col-span-1" : "sm:col-span-2"}>
            <label htmlFor={`s-${sectionKey}-${field.name}`} className="field-label">
              {field.label}
            </label>
            {field.type === "textarea" ? (
              <textarea
                id={`s-${sectionKey}-${field.name}`}
                name={field.name}
                rows={4}
                defaultValue={String(values[field.name] ?? "")}
                placeholder={field.placeholder}
                className="field resize-y"
              />
            ) : (
              <input
                id={`s-${sectionKey}-${field.name}`}
                name={field.name}
                type={field.type}
                defaultValue={String(values[field.name] ?? "")}
                placeholder={field.placeholder}
                className="field"
              />
            )}
            {field.help && <p className="mt-2 text-xs text-black/40">{field.help}</p>}
          </div>
        ))}
      </div>

      <button type="submit" disabled={pending} className="btn-primary py-2.5 text-sm">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" strokeWidth={1.5} />}
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
