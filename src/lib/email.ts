import nodemailer, { type Transporter } from "nodemailer";

/**
 * Email is sent over plain SMTP so any free provider works — set the SMTP_*
 * vars for Resend (smtp.resend.com:465, user "resend", password = API key),
 * Brevo, SendGrid, Mailgun, Gmail, etc. If nothing is configured the app still
 * works; organizers just copy the invite link instead.
 */
export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );
}

export function fromAddress(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "no-reply@localhost"
  );
}

let cached: Transporter | null = null;

function getTransport(): Transporter {
  if (cached) return cached;
  const port = Number(process.env.SMTP_PORT || 587);
  cached = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 is implicit TLS; 587/2525 use STARTTLS if offered.
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return cached;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export async function sendEmail(
  input: SendEmailInput
): Promise<{ ok: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    return { ok: false, error: "Email is not configured" };
  }
  try {
    await getTransport().sendMail({
      from: fromAddress(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo,
    });
    return { ok: true };
  } catch (e) {
    console.error("[email] send failed", e);
    return { ok: false, error: e instanceof Error ? e.message : "Send failed" };
  }
}

/** Branded invite email (inline styles — email clients ignore <style>). */
export function inviteEmailContent(opts: {
  name: string;
  url: string;
  invitedByName?: string | null;
}): { subject: string; html: string; text: string } {
  const first = opts.name.split(" ")[0] || "there";
  const by = opts.invitedByName ? ` by ${opts.invitedByName}` : "";
  const subject = "You're invited to the FBCH Meeting Scheduler";

  const text = `Hi ${first},

You've been invited${by} to help schedule meetings for First Baptist Church Henrietta.

Open this link to sign in automatically and set up a passkey (no password needed):
${opts.url}

The link works on your phone or computer.`;

  const html = `<!-- FBCH invite -->
<div style="margin:0;padding:24px;background:#eef1f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;">
    <tr><td style="padding:8px 4px 16px;">
      <span style="display:inline-block;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#26388e;font-weight:700;">First Baptist Church Henrietta</span>
    </td></tr>
    <tr><td style="background:#ffffff;border:1px solid #dde3ee;border-radius:16px;padding:28px;">
      <h1 style="margin:0 0 8px;font-size:20px;color:#0f1a33;">You're invited${by ? " " + escapeHtml(by.trim()) : ""}</h1>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#46536e;">
        Hi ${escapeHtml(first)}, you've been invited to help schedule meetings for
        First Baptist Church Henrietta. Tap the button to sign in automatically and
        set up a <strong>passkey</strong> — no password to remember.
      </p>
      <a href="${escapeAttr(opts.url)}" style="display:inline-block;background:#26388e;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:12px;">
        Accept invite &amp; create a passkey
      </a>
      <p style="margin:16px 0 0;font-size:12px;color:#6b768f;">
        Or paste this link into your browser:<br>
        <span style="word-break:break-all;color:#46536e;">${escapeHtml(opts.url)}</span>
      </p>
      <p style="margin:16px 0 0;font-size:12px;color:#6b768f;">
        The link works on your phone or computer, and lets you sign in on a desktop
        by scanning a code with your phone.
      </p>
    </td></tr>
  </table>
</div>`;

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
