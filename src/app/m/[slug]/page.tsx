import type { Metadata } from "next";
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
import { recordPublicView } from "@/lib/views";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Give shared poll links a real title + description. The branded preview image
 * comes from the sibling opengraph-image.tsx automatically.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const meeting = await prisma.meeting
    .findUnique({ where: { slug } })
    .catch(() => null);
  if (!meeting || meeting.status === "DRAFT") {
    return { title: "FBCH Meeting Scheduler" };
  }
  const title = meeting.meetingSubject || meeting.title;
  const description = meeting.chosenSlotKey
    ? "It's set — see the details and add it to your calendar."
    : "Pick the times that work for you.";
  const ogTitle = `${title} · First Baptist Church Henrietta`;
  return {
    title: `${title} · FBCH`,
    description,
    openGraph: { title: ogTitle, description },
    twitter: { card: "summary_large_image", title: ogTitle, description },
  };
}

export default async function PublicMeetingPage({ params }: Props) {
  const { slug } = await params;
  const meeting = await prisma.meeting.findUnique({
    where: { slug },
    include: { responses: true },
  });
  if (!meeting || meeting.status === "DRAFT") notFound();

  // Count real human opens of the shared link (bots/previews skipped).
  await recordPublicView("meeting", meeting.id);

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
