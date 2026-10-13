import "server-only";

/**
 * Best-effort in-memory rate limiter for public form submissions.
 *
 * This is a first line of defence so a single client cannot hammer a server
 * action. It is per-instance, so on a multi-instance deployment (Vercel
 * serverless) it limits per lambda rather than globally. For production,
 * pair it with a platform-level control such as Vercel WAF / Bot Protection
 * — see docs/DEPLOYMENT.md.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const MAX_ENTRIES = 5000;

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit = 5, windowMs = 10 * 60 * 1000): RateLimitResult {
  const now = Date.now();

  // Opportunistic cleanup so the map cannot grow without bound.
  if (buckets.size > MAX_ENTRIES) {
    for (const [k, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(k);
    }
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}

/** Extract a client identifier from request headers (best effort). */
export async function clientKey(scope: string): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const ip =
      h.get("x-real-ip") ??
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    return `${scope}:${ip}`;
  } catch {
    return `${scope}:unknown`;
  }
}
