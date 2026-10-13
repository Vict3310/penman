import Link from "next/link";
import { Search } from "lucide-react";

export interface FilterField {
  name: string;
  label: string;
  type: "text" | "select" | "number";
  placeholder?: string;
  options?: { value: string; label: string }[];
}

/**
 * A plain GET form: filters apply on submit without any client-side
 * JavaScript, which keeps the catalogue pages fast and fully functional
 * without hydration. The current query string is preserved via hidden inputs.
 */
export function FilterForm({
  action,
  fields,
  values,
  submitLabel = "Apply filters",
}: {
  action: string;
  fields: FilterField[];
  values: Record<string, string | undefined>;
  submitLabel?: string;
}) {
  const activeCount = fields.filter((f) => values[f.name]).length;

  return (
    <form
      action={action}
      method="get"
      className="card-surface mb-10 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4"
      role="search"
    >
      {fields.map((field) => (
        <div key={field.name} className="flex flex-col">
          <label htmlFor={`filter-${field.name}`} className="field-label">
            {field.label}
          </label>
          {field.type === "select" ? (
            <select
              id={`filter-${field.name}`}
              name={field.name}
              defaultValue={values[field.name] ?? ""}
              className="field appearance-none bg-white"
            >
              <option value="">All</option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`filter-${field.name}`}
              name={field.name}
              type={field.type}
              inputMode={field.type === "number" ? "numeric" : undefined}
              placeholder={field.placeholder}
              defaultValue={values[field.name] ?? ""}
              className="field"
            />
          )}
        </div>
      ))}

      <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-4">
        <button type="submit" className="btn-primary py-3 text-sm">
          <Search className="h-4 w-4" strokeWidth={1.5} />
          {submitLabel}
        </button>
        {activeCount > 0 && (
          <Link href={action} className="btn-ghost py-3">
            Clear filters
          </Link>
        )}
        {activeCount > 0 && (
          <p className="self-center text-xs text-black/40">
            {activeCount} filter{activeCount === 1 ? "" : "s"} active
          </p>
        )}
      </div>
    </form>
  );
}
