import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The account store is module-level on purpose (one request per page view, no
 * provider to mount). That also means it outlives client-side navigation — and
 * therefore the redirect a sign-in, sign-up or sign-out performs. These tests
 * pin the behaviour that made the sidebar footer keep offering "Sign in" to a
 * customer who had just created an account: the first snapshot must be
 * replaced when the chrome mounts again.
 */

function reply(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const SIGNED_OUT = {
  signedIn: false,
  user: null,
  saved: { vehicles: [], products: [], properties: [] },
};

const SIGNED_IN = {
  signedIn: true,
  user: { name: "Ada Example", initials: "AE", isAdmin: false },
  saved: { vehicles: ["v1"], products: [], properties: [] },
};

async function loadStore() {
  vi.resetModules();
  return import("@/components/account/account-state");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("account snapshot", () => {
  it("loads once and reports the signed-out state", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(SIGNED_OUT));
    vi.stubGlobal("fetch", fetchMock);

    const store = await loadStore();
    const snapshot = store.getAccountSnapshot();

    expect(snapshot.loaded).toBe(false);

    store.subscribeToAccount(() => {});
    await vi.waitFor(() => expect(store.getAccountSnapshot().loaded).toBe(true));

    expect(store.getAccountSnapshot().signedIn).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/account/state");
  });

  /**
   * The regression. Without refreshAccountState() the store short-circuits on
   * `state.loaded` and the pre-auth snapshot survives for the life of the tab.
   */
  it("replaces the signed-out snapshot after a refresh", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reply(SIGNED_OUT))
      .mockResolvedValueOnce(reply(SIGNED_IN));
    vi.stubGlobal("fetch", fetchMock);

    const store = await loadStore();
    store.subscribeToAccount(() => {});
    await vi.waitFor(() => expect(store.getAccountSnapshot().loaded).toBe(true));
    expect(store.getAccountSnapshot().signedIn).toBe(false);

    store.refreshAccountState();
    await vi.waitFor(() => expect(store.getAccountSnapshot().signedIn).toBe(true));

    expect(store.getAccountSnapshot().user?.initials).toBe("AE");
    expect([...store.getAccountSnapshot().saved.vehicle]).toEqual(["v1"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("coalesces concurrent refreshes into the in-flight request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(SIGNED_OUT));
    vi.stubGlobal("fetch", fetchMock);

    const store = await loadStore();
    store.subscribeToAccount(() => {});
    store.refreshAccountState();
    store.refreshAccountState();

    await vi.waitFor(() => expect(store.getAccountSnapshot().loaded).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("stops waiting when the endpoint fails, keeping the previous snapshot", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reply(SIGNED_IN))
      .mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    const store = await loadStore();
    store.subscribeToAccount(() => {});
    await vi.waitFor(() => expect(store.getAccountSnapshot().signedIn).toBe(true));

    store.refreshAccountState();
    // A failed refresh must not clear a known-good identity, and must not leave
    // consumers stuck on a placeholder.
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(store.getAccountSnapshot().loaded).toBe(true));
    expect(store.getAccountSnapshot().signedIn).toBe(true);
  });
});
