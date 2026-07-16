import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildMeetingIcs } from "@/lib/calendar-ics";

interface Ctx {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const meeting = await prisma.meeting.findUnique({ where: { slug } });
  if (!meeting || meeting.status === "DRAFT") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!meeting.chosenSlotKey || !meeting.meetingDurationMin) {
    return NextResponse.json(
      { error: "Meeting time not finalized yet" },
      { status: 404 }
    );
  }

  const base =
    process.env.APP_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "http://localhost:3000");
  const pageUrl = `${base.replace(/\/$/, "")}/m/${meeting.slug}`;

  const ics = buildMeetingIcs({
    uid: `${meeting.id}@fbch-meetings`,
    slotKey: meeting.chosenSlotKey,
    durationMinutes: meeting.meetingDurationMin,
    timezone: meeting.timezone,
    subject: meeting.meetingSubject || meeting.title,
    description: meeting.meetingBody || meeting.description,
    location: meeting.meetingLocation,
    url: pageUrl,
  });

  const filename = `${(meeting.meetingSubject || meeting.title)
    .replace(/[^a-z0-9]+/gi, "-")
    .slice(0, 40)}.ics`;

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
