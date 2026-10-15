"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import { ArrowRight, CheckCircle2, X } from "lucide-react";
import { useActionState, useState } from "react";
import { IDLE_RESULT, type ActionResult } from "@/lib/action-result";
import { isClerkConfigured } from "@/lib/env";
import { cn } from "@/lib/utils";

export interface EnquiryField {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "date" | "number" | "textarea";
  required?: boolean;
  placeholder?: string;
  /** Render side-by-side with the previous field on wider screens. */
  half?: boolean;
  defaultValue?: string;
  min?: string;
  rows?: number;
}

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

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
  if (!isClerkConfigured()) {
    return <EnquiryFormBody
      action={action}
      fields={fields}
      hidden={hidden}
      submitLabel={submitLabel}
      whatsappHref={whatsappHref}
      whatsappLabel={whatsappLabel}
      compact={compact}
      requireAuth={false}
    />;
  }

  return <EnquiryFormBody
    action={action}
    fields={fields}
    hidden={hidden}
    submitLabel={submitLabel}
    whatsappHref={whatsappHref}
    whatsappLabel={whatsappLabel}
    compact={compact}
    requireAuth
  />;
}

function EnquiryFormBody({
  action,
  fields,
  hidden,
  submitLabel,
  whatsappHref,
  whatsappLabel,
  compact,
  requireAuth,
}: {
  action: Action;
  fields: EnquiryField[];
  hidden: Record<string, string | null | undefined>;
  submitLabel: string;
  whatsappHref?: string | null;
  whatsappLabel: string;
  compact: boolean;
  requireAuth: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT);
  const { isLoaded, isSignedIn } = requireAuth ? useUser() : { isLoaded: true, isSignedIn: true };
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (requireAuth && isLoaded && !isSignedIn) {
      event.preventDefault();
      setAuthModalOpen(true);
    }
  };

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
    <>
      {requireAuth && isLoaded && !isSignedIn && (
        <div className="mb-5 rounded-2xl border border-sage bg-sage/20 p-4 text-sm text-ink">
          <p className="font-medium">Create an account to continue</p>
          <p className="mt-1 text-black/60">Sign in or sign up to send enquiries and requests.</p>
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="mt-3 inline-flex items-center rounded-full bg-ink px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-white transition hover:bg-forest"
          >
            Sign in / Sign up
          </button>
        </div>
      )}

      <form
        action={formAction}
        onSubmit={handleSubmit}
        className={cn("space-y-6", compact && "space-y-5")}
        noValidate
      >
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

                {field.type === "textarea" ? (
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
          <button type="submit" disabled={pending || (requireAuth && isLoaded && !isSignedIn)} className="btn-primary group text-base">
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

      {requireAuth && authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
            <button
              type="button"
              onClick={() => setAuthModalOpen(false)}
              aria-label="Close sign in"
              className="absolute right-4 top-4 rounded-full border border-black/10 p-2 text-black/60 transition hover:text-forest"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </button>
            <div className="pt-8">
              <SignIn
                routing="path"
                path="/sign-in"
                signUpUrl="/sign-up"
                forceRedirectUrl={typeof window !== "undefined" ? window.location.href : undefined}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
