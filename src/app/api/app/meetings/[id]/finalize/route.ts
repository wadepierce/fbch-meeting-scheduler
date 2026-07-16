import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateSlotKeys } from "@/lib/meeting-poll";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const meeting = await prisma.meeting.findUnique({ where: { id } });
  if (!meeting) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const slotKey = String(body.slotKey ?? "").trim();
  const durationMinutes = Number(
    body.durationMinutes ?? meeting.durationHintMinutes ?? meeting.slotMinutes
  );
  const subject = String(body.subject ?? meeting.title).trim();

  if (!slotKey || !subject) {
    return NextResponse.json(
      { error: "slotKey and subject are required" },
      { status: 400 }
    );
  }

  const validKeys = generateSlotKeys({
    dates: meeting.dates,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    slotMinutes: meeting.slotMinutes,
    timezone: meeting.timezone,
  });
  if (!validKeys.includes(slotKey)) {
    return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
  }

  const updated = await prisma.meeting.update({
    where: { id },
    data: {
      chosenSlotKey: slotKey,
      meetingDurationMin: durationMinutes,
      meetingSubject: subject,
      meetingBody: body.body != null ? String(body.body).trim() || null : null,
      meetingLocation:
        body.location != null ? String(body.location).trim() || null : null,
      finalizedAt: new Date(),
      status: body.closePoll === false ? meeting.status : "CLOSED",
    },
  });

  return NextResponse.json({
    meeting: updated,
    icsUrl: `/api/m/${meeting.slug}/ics`,
  });
}
