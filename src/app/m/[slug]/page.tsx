import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import RespondClient from "@/components/RespondClient";
import {
  aggregateResponses,
  generateSlotKeys,
  rankBestSlots,
} from "@/lib/meeting-poll";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PublicMeetingPage({ params }: Props) {
  const { slug } = await params;
  const meeting = await prisma.meeting.findUnique({
    where: { slug },
    include: { responses: true },
  });
  if (!meeting || meeting.status === "DRAFT") notFound();

  const guestToken = (await cookies()).get("fbch_guest")?.value ?? null;
  const validKeys = generateSlotKeys({
    dates: meeting.dates,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    slotMinutes: meeting.slotMinutes,
    timezone: meeting.timezone,
  });
  const aggregates = aggregateResponses(meeting.responses, validKeys);
  const bestSlots = rankBestSlots(
    aggregates,
    {
      dates: meeting.dates,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      slotMinutes: meeting.slotMinutes,
      timezone: meeting.timezone,
      durationHintMinutes: meeting.durationHintMinutes,
    },
    5
  );
  const mine = guestToken
    ? meeting.responses.find((r) => r.guestToken === guestToken)
    : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 to-slate-100 px-3 py-8 sm:px-4">
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
          First Baptist Church Henrietta
        </p>
      </div>
      <RespondClient
        initial={{
          meeting: {
            id: meeting.id,
            slug: meeting.slug,
            title: meeting.title,
            description: meeting.description,
            status: meeting.status,
            timezone: meeting.timezone,
            slotMinutes: meeting.slotMinutes,
            startTime: meeting.startTime,
            endTime: meeting.endTime,
            dates: meeting.dates,
            durationHintMinutes: meeting.durationHintMinutes,
            chosenSlotKey: meeting.chosenSlotKey,
            meetingDurationMin: meeting.meetingDurationMin,
            meetingSubject: meeting.meetingSubject,
            meetingLocation: meeting.meetingLocation,
          },
          aggregates,
          bestSlots,
          responseCount: meeting.responses.length,
          myResponse: mine
            ? { slots: mine.slots, displayName: mine.displayName }
            : null,
        }}
      />
    </main>
  );
}
