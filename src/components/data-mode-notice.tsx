import { AlertCircle, Info } from "lucide-react";
import { isDemoMode } from "@/lib/demo";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * Tells the truth about where the page content came from.
 *   * Demo mode  → clearly-labelled placeholder listings (development only).
 *   * Unconfigured → no data at all, with setup instructions.
 *   * Configured → renders nothing.
 */
export function DataModeNotice({ context }: { context?: string }) {
  if (isSupabaseConfigured()) return null;

  if (isDemoMode()) {
    return (
      <div className="rounded-2xl border border-forest/20 bg-sage/70 p-5 text-sm text-forest">
        <div className="flex items-center gap-2 font-medium">
          <Info className="h-4 w-4" strokeWidth={1.75} />
          Demonstration listings
        </div>
        <p className="mt-2 text-forest/80">
          {context ? `${context} ` : ""}
          These are placeholder records so the design can be reviewed. They are not real
          listings and they are not connected to a database.
        </p>
        <p className="mt-2 text-forest/70">
          Connect Supabase and run the migrations to replace them with your own content — the
          placeholders disappear automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="card-surface flex flex-col items-start gap-3 p-6">
      <div className="flex items-center gap-2 text-amber-700">
        <AlertCircle className="h-5 w-5" strokeWidth={1.5} />
        <p className="font-display text-base tracking-tight">Database not connected</p>
      </div>
      <p className="text-sm text-black/60">
        {context ? `${context} ` : ""}
        This deployment has no Supabase credentials yet, so there is nothing to display.
      </p>
      <p className="text-sm text-black/60">
        Set <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, run the
        migrations in <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs">supabase/migrations</code>, then
        reload. See <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs">docs/DEPLOYMENT.md</code>.
      </p>
    </div>
  );
}
