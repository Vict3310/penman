"use client";

import type { SavedKind } from "@/lib/types";

/**
 * Client-side account state, shared by every consumer on the page.
 *
 * A module-level store rather than a React context, for two reasons:
 *
 *   1. No provider to mount. The consumers — a bookmark on a listing card, a
 *      sidebar three levels up in the layout — sit in different parts of the
 *      tree, and threading a provider through every layout to reach them would
 *      mean editing a dozen files to support one button.
 *   2. One request per page view, not one per consumer. The first consumer to
 *      mount triggers a single fetch of `/api/account/state`; everything else
 *      reads the same in-memory result. That endpoint is also what keeps the
 *      public pages cacheable — see its own note.
 *
 * The snapshot is replaced as a unit, never mutated, so `getSnapshot()` is
 * referentially stable between changes — which is what `useSyncExternalStore`
 * requires to avoid an infinite render loop.
 */

export interface AccountIdentity {
  name: string;
  initials: string;
  isAdmin: boolean;
}

export interface AccountState {
  loaded: boolean;
  signedIn: boolean;
  user: AccountIdentity | null;
  saved: Record<SavedKind, Set<string>>;
}

function emptySaved(): Record<SavedKind, Set<string>> {
  return { vehicle: new Set(), product: new Set(), property: new Set() };
}

/**
 * The state an SSR pass renders with.
 *
 * Deliberately "nothing known yet" and a stable constant: the server must not
 * claim to know who is signed in on a cached page, and an unstable snapshot
 * would loop the renderer.
 */
const SERVER_SNAPSHOT: AccountState = {
  loaded: false,
  signedIn: false,
  user: null,
  saved: emptySaved(),
};

let state: AccountState = SERVER_SNAPSHOT;
let inflight: Promise<void> | null = null;

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function asStringSet(value: unknown): Set<string> {
  return new Set(Array.isArray(value) ? (value as string[]) : []);
}

/**
 * Fetch the session summary once per page load.
 *
 * Failure is silent by design. A signed-out visitor produces an empty
 * response, and a network error leaves the controls showing "not saved" — the
 * buttons still work, and nothing about the page's usefulness depends on this
 * having succeeded.
 */
function ensureLoaded(): void {
  if (state.loaded || inflight) return;

  inflight = fetch("/api/account/state", { credentials: "same-origin" })
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => {
      if (!data) return;

      state = {
        loaded: true,
        signedIn: Boolean(data.signedIn),
        user: data.user ?? null,
        saved: {
          vehicle: asStringSet(data.saved?.vehicles),
          product: asStringSet(data.saved?.products),
          property: asStringSet(data.saved?.properties),
        },
      };
    })
    .catch(() => {
      // Leave the empty state in place, but stop waiting: `loaded` must flip so
      // consumers render their fallback instead of a permanent placeholder.
      state = { ...state, loaded: true };
    })
    .finally(() => {
      inflight = null;
      emit();
    });
}

export function subscribeToAccount(listener: () => void): () => void {
  listeners.add(listener);
  ensureLoaded();
  return () => {
    listeners.delete(listener);
  };
}

export function getAccountSnapshot(): AccountState {
  return state;
}

export function getAccountServerSnapshot(): AccountState {
  return SERVER_SNAPSHOT;
}

/**
 * Update the saved sets after the server has confirmed a change.
 *
 * Called optimistically before the reply, and again to correct it if the reply
 * disagrees, so the bookmark never shows a state the database does not have.
 */
export function setSavedState(kind: SavedKind, id: string, saved: boolean): void {
  const next = new Set(state.saved[kind]);
  if (saved) next.add(id);
  else next.delete(id);

  if (next.size === state.saved[kind].size && state.saved[kind].has(id) === saved) return;

  state = { ...state, saved: { ...state.saved, [kind]: next } };
  emit();
}
