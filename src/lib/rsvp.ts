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
