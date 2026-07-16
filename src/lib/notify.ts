import { prisma } from "./db";
import { isEmailConfigured, sendEmail } from "./email";

/**
 * Organizer-facing notification emails, sent only when the recipient has the
 * matching preference enabled (self-service on the Account page). All senders
 * are fire-and-safe: failures are logged, never thrown.
 */

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function notificationHtml(opts: {
  heading: string;
  lines: string[];
  ctaLabel: string;
  ctaUrl: string;
  manageUrl: string;
}): string {
  return `<div style="margin:0;padding:24px;background:#eef1f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;">
    <tr><td style="padding:8px 4px 16px;">
      <span style="display:inline-block;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#26388e;font-weight:700;">FBCH Meeting Scheduler</span>
    </td></tr>
    <tr><td style="background:#ffffff;border:1px solid #dde3ee;border-radius:16px;padding:28px;">
      <h1 style="margin:0 0 12px;font-size:18px;color:#0f1a33;">${esc(opts.heading)}</h1>
      ${opts.lines
        .map(
          (l) =>
            `<p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#46536e;">${esc(l)}</p>`
        )
        .join("")}
      <a href="${esc(opts.ctaUrl)}" style="display:inline-block;margin-top:12px;background:#26388e;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 18px;border-radius:12px;">${esc(opts.ctaLabel)}</a>
      <p style="margin:20px 0 0;font-size:11px;color:#6b768f;">
        You're getting this because notifications are on for your account.
        <a href="${esc(opts.manageUrl)}" style="color:#26388e;">Manage notifications</a>
      </p>
    </td></tr>
  </table>
</div>`;
}

/** New availability painted on one of the organizer's meeting polls. */
export async function notifyPollResponse(opts: {
  meetingId: string;
  responderName: string;
  slotCount: number;
  baseUrl: string;
}): Promise<void> {
  if (!isEmailConfigured()) return;
  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id: opts.meetingId },
      include: {
        createdBy: true,
        _count: { select: { responses: true } },
      },
    });
    const org = meeting?.createdBy;
    if (!meeting || !org || !org.active || !org.notifyPollResponses) return;

    const url = `${opts.baseUrl}/app/${meeting.id}`;
    const manageUrl = `${opts.baseUrl}/app/security`;
    const total = meeting._count.responses;
    const subject = `${opts.responderName} responded to “${meeting.title}”`;
    const lines = [
      `${opts.responderName} painted ${opts.slotCount} time slot${
        opts.slotCount === 1 ? "" : "s"
      } on “${meeting.title}”.`,
      `${total} ${total === 1 ? "person has" : "people have"} responded so far.`,
    ];

    const res = await sendEmail({
      to: org.email,
      subject,
      text: `${lines.join("\n")}\n\nSee responses: ${url}`,
      html: notificationHtml({
        heading: subject,
        lines,
        ctaLabel: "See responses",
        ctaUrl: url,
        manageUrl,
      }),
    });
    if (!res.ok) console.error("[notify] poll response email failed:", res.error);
  } catch (e) {
    console.error("[notify] poll response notification error", e);
  }
}

/** New reply on one of the organizer's RSVP headcounts. */
export async function notifyRsvpReply(opts: {
  rsvpId: string;
  responderName: string;
  answer: "YES" | "MAYBE" | "NO";
  count: number;
  baseUrl: string;
}): Promise<void> {
  if (!isEmailConfigured()) return;
  try {
    const rsvp = await prisma.rsvp.findUnique({
      where: { id: opts.rsvpId },
      include: { responses: { select: { answer: true, count: true } } },
    });
    if (!rsvp || !rsvp.createdById) return;
    const org = await prisma.organizer.findUnique({
      where: { id: rsvp.createdById },
    });
    if (!org || !org.active || !org.notifyRsvpReplies) return;

    let yes = 0;
    let maybe = 0;
    for (const r of rsvp.responses) {
      if (r.answer === "YES") yes += r.count;
      else if (r.answer === "MAYBE") maybe += r.count;
    }

    const verb =
      opts.answer === "YES"
        ? `is coming${opts.count > 1 ? ` (×${opts.count})` : ""}`
        : opts.answer === "MAYBE"
          ? `might come${opts.count > 1 ? ` (×${opts.count})` : ""}`
          : "can't make it";
    const answerLabel =
      opts.answer === "YES"
        ? `I'll be there${opts.count > 1 ? ` (${opts.count} people)` : ""}`
        : opts.answer === "MAYBE"
          ? `Maybe${opts.count > 1 ? ` (${opts.count} people)` : ""}`
          : "Can't make it";
    const url = `${opts.baseUrl}/app/rsvp/${rsvp.id}`;
    const manageUrl = `${opts.baseUrl}/app/security`;
    const subject = `${opts.responderName} ${verb} — “${rsvp.title}”`;
    const lines = [
      `${opts.responderName} said "${answerLabel}" for “${rsvp.title}”.`,
      `Headcount so far: ${yes} coming${maybe ? `, ${maybe} maybe` : ""}.`,
    ];

    const res = await sendEmail({
      to: org.email,
      subject,
      text: `${lines.join("\n")}\n\nSee the headcount: ${url}`,
      html: notificationHtml({
        heading: subject,
        lines,
        ctaLabel: "See the headcount",
        ctaUrl: url,
        manageUrl,
      }),
    });
    if (!res.ok) console.error("[notify] rsvp reply email failed:", res.error);
  } catch (e) {
    console.error("[notify] rsvp notification error", e);
  }
}
