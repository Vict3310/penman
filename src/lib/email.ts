import "server-only";

/**
 * Transactional email.
 *
 * One provider, called over HTTP rather than through an SDK: this is a single
 * POST with a bearer token, and a dependency would add install surface for no
 * behaviour. Resend is used because a password-reset link is exactly the
 * transactional case it is built for, and it needs one key.
 *
 * Configuration:
 *   RESEND_API_KEY   server-only key. Without it, production sends nothing.
 *   EMAIL_FROM       the verified sender, e.g. "Penman Empire <no-reply@penmanempire.com>".
 *
 * Development is deliberately different: with no key, the link is printed to
 * the server console so the flow can be tested end to end before email is
 * configured. That never happens in production — printing a reset link to a
 * production log would hand account takeover to anyone who can read the logs.
 */

export interface SendResult {
  sent: boolean;
  /** Machine-readable cause, for logs. Never shown to the customer. */
  reason?: "not-configured" | "rejected" | "network" | "dev-console";
}

export interface PasswordResetEmail {
  to: string;
  name: string | null;
  resetUrl: string;
  expiresInMinutes: number;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function greeting(name: string | null): string {
  const trimmed = name?.trim();
  return trimmed ? trimmed.split(/\s+/)[0] ?? "there" : "there";
}

/** The HTML body. Deliberately plain: no images, no tracking, one link. */
function renderHtml({ name, resetUrl, expiresInMinutes }: PasswordResetEmail): string {
  const hi = escapeHtml(greeting(name));
  const url = escapeHtml(resetUrl);

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f4f1ea;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1d241f;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;border:1px solid #e6e2d8;">
      <p style="margin:0 0 20px;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#6b7268;">Penman Empire</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:500;">Reset your password</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Hi ${hi},</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">
        Someone asked to reset the password for the Penman Empire account using this address.
        If that was you, use the button below. The link works once and expires in ${expiresInMinutes} minutes.
      </p>
      <p style="margin:0 0 24px;">
        <a href="${url}" style="display:inline-block;background:#1d3b2a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:15px;">Choose a new password</a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#5c635a;">If the button does not work, copy this address into your browser:</p>
      <p style="margin:0 0 20px;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${url}" style="color:#1d3b2a;">${url}</a></p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#5c635a;">
        If you did not ask for this, you can ignore this email. Your password has not changed.
      </p>
    </div>
  </body>
</html>`;
}

function renderText({ name, resetUrl, expiresInMinutes }: PasswordResetEmail): string {
  return [
    `Hi ${greeting(name)},`,
    "",
    "Someone asked to reset the password for the Penman Empire account using this address.",
    `If that was you, open this link. It works once and expires in ${expiresInMinutes} minutes:`,
    "",
    resetUrl,
    "",
    "If you did not ask for this, ignore this email. Your password has not changed.",
  ].join("\n");
}

/**
 * Send the reset link. Never throws: a mail outage must not turn into a 500 that
 * tells the caller whether the address exists.
 */
export async function sendPasswordResetEmail(
  message: PasswordResetEmail,
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || "Penman Empire <onboarding@resend.dev>";

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[email:dev] No RESEND_API_KEY set. Password reset link for ${message.to}:\n${message.resetUrl}`,
      );
      return { sent: true, reason: "dev-console" };
    }

    console.error(
      "Password reset email was not sent: RESEND_API_KEY is not set on this deployment.",
    );
    return { sent: false, reason: "not-configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: "Reset your Penman Empire password",
        html: renderHtml(message),
        text: renderText(message),
      }),
    });

    if (!response.ok) {
      // Read a bounded slice: provider errors can include the recipient, which
      // is fine in a server log, but not an unbounded response body.
      const detail = (await response.text()).slice(0, 300);
      console.error(`Resend rejected the reset email (${response.status}): ${detail}`);
      return { sent: false, reason: "rejected" };
    }

    return { sent: true };
  } catch (error) {
    console.error(
      "Password reset email failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return { sent: false, reason: "network" };
  }
}
