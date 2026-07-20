import { createId } from "@paralleldrive/cuid2";

export interface RsvpTally {
  yes: number;
  maybe: number;
  no: number;
  replies: number;
}

export function tallyRsvp(
  responses: { answer: string; count: number }[]
): RsvpTally {
  const t: RsvpTally = { yes: 0, maybe: 0, no: 0, replies: responses.length };
  for (const r of responses) {
    if (r.answer === "YES") t.yes += r.count;
    else if (r.answer === "MAYBE") t.maybe += r.count;
    else t.no += r.count;
  }
  return t;
}

/** "Sunday, July 26 · 10:30 AM CDT" in the event's timezone. */
export function formatEventWhen(
  startsAt: Date | string,
  timezone: string,
  endsAt?: Date | string | null
): string {
  const start = typeof startsAt === "string" ? new Date(startsAt) : startsAt;
  const date = start.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: timezone,
  });
  const time = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: timezone,
  });
  let out = `${date} · ${time}`;
  if (endsAt) {
    const end = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
    const endTime = end.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    });
    out = `${date} · ${start.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    })} – ${endTime} ${shortTzName(start, timezone)}`;
  }
  return out;
}

function shortTzName(d: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "short",
  }).formatToParts(d);
  return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
}

/** The message an organizer texts out with the RSVP link. */
export function rsvpShareMessage(opts: {
  title: string;
  when: string;
  location?: string | null;
  url: string;
}): string {
  return (
    `${opts.title} — ${opts.when}` +
    (opts.location ? ` at ${opts.location}` : "") +
    `. Can you make it? Tap to RSVP so we can get a headcount: ${opts.url}`
  );
}

/** Default per-person text template for roster outreach. */
export const DEFAULT_RSVP_MESSAGE_TEMPLATE =
  "Hi %first%, %event% is %when%%where_clause%. Would you mind letting me know if you can make it by clicking here? It's super simple and helps me know who and how many to expect.\n%link%";

export function newInviteeToken(): string {
  return createId();
}

/** Stable guestToken used for invitee-bound responses (unique per rsvp). */
export function inviteeGuestToken(inviteeId: string): string {
  return `inv:${inviteeId}`;
}

/**
 * Digits for sms: links. Keeps a leading + when present; otherwise strips to
 * digits only (US 10-digit numbers work fine without country code on device).
 */
export function normalizePhoneForSms(
  phone: string | null | undefined
): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7) return null;
  return hasPlus ? `+${digits}` : digits;
}

/** Build an sms: deep link. Phone optional (opens composer without recipient). */
export function smsHref(
  phone: string | null | undefined,
  body: string
): string {
  const to = normalizePhoneForSms(phone);
  const q = `?&body=${encodeURIComponent(body)}`;
  return to ? `sms:${to}${q}` : `sms:${q}`;
}

export type TemplateContext = {
  firstName: string;
  lastName: string;
  displayName: string;
  eventTitle: string;
  when: string;
  location?: string | null;
  link: string;
};

/**
 * Fill %first% %last% %name% %event% %when% %where% %where_clause% %link%.
 * Appends the link on its own line if the template never mentions %link%.
 */
export function fillRsvpMessageTemplate(
  template: string | null | undefined,
  ctx: TemplateContext
): string {
  const tpl = (template?.trim() || DEFAULT_RSVP_MESSAGE_TEMPLATE).trim();
  const where = ctx.location?.trim() || "";
  const whereClause = where ? ` at ${where}` : "";

  let out = tpl
    .replace(/%first%/gi, ctx.firstName || ctx.displayName.split(/\s+/)[0] || "")
    .replace(/%last%/gi, ctx.lastName || "")
    .replace(/%name%/gi, ctx.displayName || ctx.firstName)
    .replace(/%event%/gi, ctx.eventTitle)
    .replace(/%when%/gi, ctx.when)
    .replace(/%where_clause%/gi, whereClause)
    .replace(/%where%/gi, where)
    .replace(/%link%/gi, ctx.link);

  if (!/%link%/i.test(tpl) && !out.includes(ctx.link)) {
    out = `${out.trim()}\n${ctx.link}`;
  }
  return out.trim();
}

export type InviteeStatus =
  | "NO_PHONE"
  | "READY"
  | "TEXTED"
  | "OPENED"
  | "YES"
  | "MAYBE"
  | "NO";

export function inviteeStatus(inv: {
  phone: string | null;
  textedAt: Date | string | null;
  firstOpenedAt: Date | string | null;
  response?: { answer: string } | null;
}): InviteeStatus {
  if (inv.response?.answer === "YES") return "YES";
  if (inv.response?.answer === "MAYBE") return "MAYBE";
  if (inv.response?.answer === "NO") return "NO";
  if (inv.firstOpenedAt) return "OPENED";
  if (inv.textedAt) return "TEXTED";
  if (!normalizePhoneForSms(inv.phone)) return "NO_PHONE";
  return "READY";
}

export function inviteeStatusLabel(status: InviteeStatus): string {
  switch (status) {
    case "NO_PHONE":
      return "No phone";
    case "READY":
      return "Ready";
    case "TEXTED":
      return "Texted";
    case "OPENED":
      return "Opened";
    case "YES":
      return "Coming";
    case "MAYBE":
      return "Maybe";
    case "NO":
      return "Can't";
  }
}

export function splitDisplayName(name: string): {
  firstName: string;
  lastName: string;
  displayName: string;
} {
  const displayName = name.trim().replace(/\s+/g, " ");
  if (!displayName) {
    return { firstName: "", lastName: "", displayName: "" };
  }
  const parts = displayName.split(" ");
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "", displayName };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
    displayName,
  };
}

export function personalRsvpPath(slug: string, token: string): string {
  return `/r/${slug}/t/${token}`;
}

export function personalRsvpUrl(
  baseUrl: string,
  slug: string,
  token: string
): string {
  return `${baseUrl.replace(/\/$/, "")}${personalRsvpPath(slug, token)}`;
}
