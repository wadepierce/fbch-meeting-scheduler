/**
 * Minimal RFC 5545 .ics generator for finalized meetings.
 * Works with iOS / Android "Add to Calendar" when served as text/calendar.
 */

import {
  formatUtcForIcs,
  slotKeyToUtcDate,
} from "@/lib/meeting-poll";

export interface IcsMeetingInput {
  uid: string;
  slotKey: string;
  durationMinutes: number;
  timezone: string;
  subject: string;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  organizerEmail?: string | null;
  organizerName?: string | null;
}

function icsEscape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    parts.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  return parts.join("\r\n");
}

export function buildMeetingIcs(input: IcsMeetingInput): string {
  const start = slotKeyToUtcDate(input.slotKey, input.timezone, 0);
  const end = slotKeyToUtcDate(
    input.slotKey,
    input.timezone,
    input.durationMinutes
  );
  const now = formatUtcForIcs(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FBCH Meeting Scheduler//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatUtcForIcs(start)}`,
    `DTEND:${formatUtcForIcs(end)}`,
    `SUMMARY:${icsEscape(input.subject)}`,
  ];
  if (input.description) {
    lines.push(`DESCRIPTION:${icsEscape(input.description)}`);
  }
  if (input.location) {
    lines.push(`LOCATION:${icsEscape(input.location)}`);
  }
  if (input.url) {
    lines.push(`URL:${icsEscape(input.url)}`);
  }
  if (input.organizerEmail) {
    const cn = input.organizerName
      ? `;CN=${icsEscape(input.organizerName)}`
      : "";
    lines.push(`ORGANIZER${cn}:mailto:${input.organizerEmail}`);
  }
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
