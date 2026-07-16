import { NextRequest, NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateSlotKeys, slugifyTitle } from "@/lib/meeting-poll";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const meetings = await prisma.meeting.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { responses: true } } },
  });
  return NextResponse.json({ meetings });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const startTime = String(body.startTime ?? "09:00");
  const endTime = String(body.endTime ?? "17:00");
  const slotMinutes = Number(body.slotMinutes ?? 30);
  const timezone = String(body.timezone ?? "America/Chicago");
  const dates = Array.isArray(body.dates)
    ? (body.dates as unknown[]).map(String).filter((d) => DATE_RE.test(d))
    : [];

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
    return NextResponse.json({ error: "Invalid times" }, { status: 400 });
  }
  if (dates.length === 0) {
    return NextResponse.json(
      { error: "Select at least one date" },
      { status: 400 }
    );
  }

  try {
    generateSlotKeys({ dates, startTime, endTime, slotMinutes, timezone });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid schedule" },
      { status: 400 }
    );
  }

  const durationHint =
    body.durationHintMinutes == null || body.durationHintMinutes === ""
      ? null
      : Number(body.durationHintMinutes);

  const base = slugifyTitle(title);
  let slug = base;
  let n = 0;
  while (await prisma.meeting.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }

  const publish = body.publish === true;

  const meeting = await prisma.meeting.create({
    data: {
      id: createId(),
      slug,
      title,
      description: body.description
        ? String(body.description).trim() || null
        : null,
      status: publish ? "ACTIVE" : "DRAFT",
      timezone,
      slotMinutes,
      startTime,
      endTime,
      dates: dates.sort(),
      durationHintMinutes: durationHint,
      createdById: session.id,
    },
  });

  return NextResponse.json({ meeting }, { status: 201 });
}
