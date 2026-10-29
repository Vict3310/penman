"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useActionState } from "react";

import { IDLE_RESULT, type ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";

export interface EnquiryField {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "date" | "number" | "textarea" | "select";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  /** Render side-by-side with the previous field on wider screens. */
  half?: boolean;
  defaultValue?: string;
  min?: string;
  rows?: number;
}

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

/**
 * The public enquiry form.
 *
 * Submitting an enquiry deliberately does NOT require an account. Browsing the
 * fleet, the listings and the shop is open to everyone, and so is getting in
 * touch — a customer who has to register before they can ask about a vehicle
 * is a customer who leaves. Accounts exist for people who want one, not as a
 * toll gate in front of an enquiry.
 *
 * Abuse is handled where it belongs rather than by requiring sign-in: every
 * submit server action applies a per-client rate limit, and the inserts run
 * through the service-role client which is never exposed to the browser.
 */
export function EnquiryForm({
  action,
  fields,
  hidden = {},
  submitLabel = "Submit",
  whatsappHref,
  whatsappLabel = "Or send it on WhatsApp",
  compact = false,
}: {
  action: Action;
  fields: EnquiryField[];
  hidden?: Record<string, string | null | undefined>;
  submitLabel?: string;
  whatsappHref?: string | null;
  whatsappLabel?: string;
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT);

  if (state.ok) {
    return (
      <div className="card-surface flex flex-col items-start gap-4 p-7">
        <CheckCircle2 className="h-8 w-8 text-leaf" strokeWidth={1.5} />
        <div>
          <p className="font-display text-lg tracking-tight">Enquiry received</p>
          <p className="mt-2 text-sm text-black/60">{state.message}</p>
        </div>
        <p className="text-xs text-black/40">
          Nothing is confirmed or reserved automatically — a member of our team reviews every request.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className={cn("space-y-6", compact && "space-y-5")} noValidate>
      {Object.entries(hidden).map(([key, value]) =>
        value ? <input key={key} type="hidden" name={key} value={value} /> : null,
      )}

      <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
        {fields.map((field) => {
          const errors = state.errors?.[field.name];
          const hasError = Boolean(errors?.length);
          const id = `field-${field.name}`;
          return (
            <div key={field.name} className={cn(!field.half && "sm:col-span-2")}>
              <label htmlFor={id} className="field-label">
                {field.label}
                {field.required && <span className="ml-1 text-forest">*</span>}
              </label>

              {field.type === "select" ? (
                <select id={id} name={field.name} defaultValue={field.defaultValue} required={field.required} aria-invalid={hasError} className={cn("field-line", hasError && "field-line-error")}>
                  {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  id={id}
                  name={field.name}
                  rows={field.rows ?? 4}
                  required={field.required}
                  placeholder={field.placeholder}
                  defaultValue={field.defaultValue}
                  aria-invalid={hasError}
                  aria-describedby={hasError ? `${id}-error` : undefined}
                  className={cn("field-line resize-none", hasError && "field-line-error")}
                />
              ) : (
                <input
                  id={id}
                  name={field.name}
                  type={field.type}
                  required={field.required}
                  placeholder={field.placeholder}
                  defaultValue={field.defaultValue}
                  min={field.min}
                  aria-invalid={hasError}
                  aria-describedby={hasError ? `${id}-error` : undefined}
                  className={cn("field-line", hasError && "field-line-error")}
                />
              )}

              {hasError && (
                <p id={`${id}-error`} className="mt-2 text-xs text-red-600">
                  {errors?.join(" ")}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!state.ok && state.message && (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-5 pt-2">
        <button type="submit" disabled={pending} className="btn-primary group text-base">
          {pending ? "Sending…" : submitLabel}
          {!pending && (
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.5} />
          )}
        </button>
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="border-b border-black/20 pb-0.5 text-sm text-black/50 transition-colors hover:border-forest hover:text-forest"
          >
            {whatsappLabel}
          </a>
        )}
      </div>
    </form>
  );
}
