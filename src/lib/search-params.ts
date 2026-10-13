export type RawSearchParams = Record<string, string | string[] | undefined>;

export function readString(params: RawSearchParams, key: string): string | undefined {
  const value = params[key];
  if (Array.isArray(value)) return value[0];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

export function readNumber(params: RawSearchParams, key: string): number | undefined {
  const raw = readString(params, key);
  if (raw === undefined) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

export function readPage(params: RawSearchParams): number {
  const page = readNumber(params, "page");
  return page && page > 0 ? Math.floor(page) : 1;
}

export function readSort<T extends string>(
  params: RawSearchParams,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = readString(params, key);
  return allowed.includes(raw as T) ? (raw as T) : fallback;
}

/** Build a query string from a params object, dropping empty values. */
export function buildQuery(params: RawSearchParams, overrides: RawSearchParams = {}): string {
  const merged: RawSearchParams = { ...params, ...overrides };
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    const single = Array.isArray(value) ? value[0] : value;
    if (single !== undefined && single !== "") search.set(key, single);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
