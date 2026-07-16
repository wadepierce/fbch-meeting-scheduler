import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createId } from "@paralleldrive/cuid2";
import { prisma } from "@/lib/db";
import { filterValidSlots, generateSlotKeys } from "@/lib/meeting-poll";

interface Ctx {
  params: Promise<{ slug: string }>;
}

const GUEST = "fbch_guest";

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const meeting = await prisma.meeting.findUnique({ where: { slug } });
  if (!meeting || meeting.status === "DRAFT") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (meeting.status === "CLOSED") {
    return NextResponse.json(
      { error: "This meeting poll is closed" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const displayName = String(body.displayName ?? "").trim();
  if (!displayName || displayName.length > 80) {
    return NextResponse.json(
      { error: "Name is required (max 80 characters)" },
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
  const slots = filterValidSlots(
    Array.isArray(body.slots) ? body.slots.map(String) : [],
    validKeys
  );

  const jar = await cookies();
  let guestToken =
    (typeof body.guestToken === "string" && body.guestToken.length >= 8
      ? body.guestToken
      : null) || jar.get(GUEST)?.value;
  if (!guestToken) guestToken = createId();

  const existing = await prisma.meetingResponse.findUnique({
    where: {
      meetingId_guestToken: { meetingId: meeting.id, guestToken },
    },
  });

  const response = existing
    ? await prisma.meetingResponse.update({
        where: { id: existing.id },
        data: {
          displayName,
          slots,
          email: body.email ? String(body.email).trim() || null : null,
        },
      })
    : await prisma.meetingResponse.create({
        data: {
          id: createId(),
          meetingId: meeting.id,
          guestToken,
          displayName,
          email: body.email ? String(body.email).trim() || null : null,
          slots,
        },
      });

  const res = NextResponse.json({
    response: {
      id: response.id,
      displayName: response.displayName,
      slots: response.slots,
      guestToken,
    },
  });
  res.cookies.set(GUEST, guestToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
