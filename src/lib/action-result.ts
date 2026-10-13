/** Uniform result returned by every server action to the client boundary. */
export interface ActionResult {
  ok: boolean;
  message: string;
  errors?: Record<string, string[]>;
  /** Populated on successful admin creates so the UI can navigate. */
  redirectTo?: string;
}

export const IDLE_RESULT: ActionResult = { ok: false, message: "" };

export function fail(message: string, errors?: Record<string, string[]>): ActionResult {
  return { ok: false, message, ...(errors ? { errors } : {}) };
}

export function succeed(message: string, redirectTo?: string): ActionResult {
  return { ok: true, message, ...(redirectTo ? { redirectTo } : {}) };
}
