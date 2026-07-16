import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import {
  aggregateResponses,
  generateSlotKeys,
  rankBestSlots,
} from "@/lib/meeting-poll";

interface Ctx {
  params: Promise<{ slug: string }>;
}

const GUEST = "fbch_guest";

export async function GET(_req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const meeting = await prisma.meeting.findUnique({
    where: { slug },
    include: { responses: true },
  });
  if (!meeting || meeting.status === "DRAFT") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const guestToken = (await cookies()).get(GUEST)?.value ?? null;
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

  return NextResponse.json({
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
  });
}
