import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  splitSlotKey,
  formatTime12,
  parseMinutes,
  formatMinutes,
  timezoneLabel,
  formatDateRange,
} from "@/lib/meeting-poll";
import PrintButton from "@/components/PrintButton";

function longDate(dateISO: string): string {
  const d = new Date(dateISO + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PrintMeetingPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const meeting = await prisma.meeting.findUnique({ where: { id } });
  if (!meeting) notFound();

  const finalized = Boolean(meeting.chosenSlotKey);
  let dateStr = "";
  let timeStr = "";
  if (meeting.chosenSlotKey) {
    const { date, time } = splitSlotKey(meeting.chosenSlotKey);
    dateStr = longDate(date);
    const start = parseMinutes(time);
    const dur = meeting.meetingDurationMin ?? meeting.durationHintMinutes ?? 60;
    const end = formatMinutes(Math.min(start + dur, 23 * 60 + 59));
    timeStr = `${formatTime12(time)} – ${formatTime12(end)} ${timezoneLabel(
      meeting.timezone
    )}`;
  }

  const title = meeting.meetingSubject || meeting.title;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href={`/app/${id}`}
          className="text-sm font-medium text-brand-text hover:underline"
        >
          ← Back to meeting
        </Link>
        {finalized && <PrintButton />}
      </div>

      <article className="mx-auto max-w-[8.5in] overflow-hidden rounded-2xl bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 print:rounded-none print:shadow-none print:ring-0">
        <div className="border-b-4 border-[#26388e] px-8 pt-8 pb-5 sm:px-10 sm:pt-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/fbch-logo.png"
            alt="First Baptist Church Henrietta"
            width={502}
            height={108}
            className="h-11 w-auto sm:h-12"
          />
        </div>

        {!finalized ? (
          <div className="px-8 py-10 sm:px-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#26388e]">
              Not finalized yet
            </p>
            <h1 className="mt-2 text-3xl font-bold">{meeting.title}</h1>
            <p className="mt-3 text-slate-600">
              This meeting hasn&apos;t been locked to a time yet. Pick the final
              time on the meeting page, then come back to print a sheet.
            </p>
            <p className="mt-4 text-sm text-slate-500">
              Candidate days: {formatDateRange(meeting.dates)}
            </p>
          </div>
        ) : (
          <div className="px-8 py-8 sm:px-10 sm:py-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#26388e]">
              First Baptist Church Henrietta
            </p>
            <h1 className="mt-2 text-4xl font-bold leading-tight">{title}</h1>

            <dl className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Date
                </dt>
                <dd className="mt-1 text-lg font-semibold text-slate-900">
                  {dateStr}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Time
                </dt>
                <dd className="mt-1 text-lg font-semibold text-slate-900">
                  {timeStr}
                </dd>
              </div>
              {meeting.meetingLocation && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Location
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-slate-900">
                    {meeting.meetingLocation}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Duration
                </dt>
                <dd className="mt-1 text-lg font-semibold text-slate-900">
                  {meeting.meetingDurationMin ??
                    meeting.durationHintMinutes ??
                    60}{" "}
                  minutes
                </dd>
              </div>
            </dl>

            {meeting.meetingBody && (
              <div className="mt-8 border-t border-slate-200 pt-6">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Notes
                </dt>
                <p className="mt-2 whitespace-pre-wrap text-slate-700">
                  {meeting.meetingBody}
                </p>
              </div>
            )}

            <div className="mt-10 border-t border-slate-200 pt-5 text-sm text-slate-500">
              Add it to your calendar or see details at{" "}
              <span className="font-medium text-slate-700">
                meet.fbchenrietta.org
              </span>
              .
            </div>
          </div>
        )}
      </article>

      <p className="mt-3 text-center text-xs text-ink-subtle print:hidden">
        Tip: in the print dialog, choose “Save as PDF” to keep or email a copy.
      </p>
    </main>
  );
}
