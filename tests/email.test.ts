import { afterEach, describe, expect, it, vi } from "vitest";

import { sendPasswordResetEmail } from "@/lib/email";

const MESSAGE = {
  to: "customer@example.com",
  name: "Ada Example",
  resetUrl: "https://penmanempire.com/reset-password?token=abc123",
  expiresInMinutes: 60,
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("password reset email", () => {
  it("posts the link to Resend with the server key", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "Penman Empire <no-reply@penmanempire.com>");

    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendPasswordResetEmail(MESSAGE);

    expect(result.sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test_key");

    const body = JSON.parse(String(init.body)) as {
      from: string;
      to: string[];
      subject: string;
      html: string;
      text: string;
    };
    expect(body.from).toBe("Penman Empire <no-reply@penmanempire.com>");
    expect(body.to).toEqual(["customer@example.com"]);
    expect(body.subject).toMatch(/reset/i);
    expect(body.html).toContain(MESSAGE.resetUrl);
    expect(body.text).toContain(MESSAGE.resetUrl);
    expect(body.html).toContain("Ada");
  });

  it("reports a provider rejection instead of throwing", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("domain is not verified", { status: 403 })),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendPasswordResetEmail(MESSAGE);
    expect(result).toEqual({ sent: false, reason: "rejected" });
  });

  it("sends nothing in production without a key, and never logs the link", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendPasswordResetEmail(MESSAGE);

    expect(result).toEqual({ sent: false, reason: "not-configured" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
    expect(JSON.stringify(error.mock.calls)).not.toContain(MESSAGE.resetUrl);
  });

  it("prints the link to the dev console when no key is configured", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    const result = await sendPasswordResetEmail(MESSAGE);

    expect(result).toEqual({ sent: true, reason: "dev-console" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(String(info.mock.calls[0]?.[0])).toContain(MESSAGE.resetUrl);
  });
});
