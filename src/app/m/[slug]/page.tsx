import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import RespondClient from "@/components/RespondClient";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
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
    <main className="min-h-screen bg-canvas px-3 py-6 sm:px-4">
      <div className="mx-auto mb-6 flex max-w-5xl items-center justify-between">
        <Logo size="sm" />
        <ThemeToggle />
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
