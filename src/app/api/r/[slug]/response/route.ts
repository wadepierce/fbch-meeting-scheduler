import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { cookies } from "next/headers";
import { createId } from "@paralleldrive/cuid2";
import { prisma } from "@/lib/db";
import { getBaseUrl } from "@/lib/base-url";
import { notifyRsvpReply } from "@/lib/notify";

interface Ctx {
  params: Promise<{ slug: string }>;
}

const GUEST = "fbch_guest";
const ANSWERS = new Set(["YES", "MAYBE", "NO"]);

/** Save (or update) this device's RSVP for an event. */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const rsvp = await prisma.rsvp.findUnique({ where: { slug } });
  if (!rsvp) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (rsvp.status === "CLOSED") {
    return NextResponse.json(
      { error: "This headcount is closed" },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const displayName = String(body.displayName ?? "").trim();
  if (!displayName || displayName.length > 80) {
    return NextResponse.json(
      { error: "Name is required (max 80 characters)" },
      { status: 400 }
    );
  }
  const answer = String(body.answer ?? "").toUpperCase();
  if (!ANSWERS.has(answer)) {
    return NextResponse.json(
      { error: "Answer must be yes, maybe, or no" },
      { status: 400 }
    );
  }
  let count = Number(body.count ?? 1);
  if (!Number.isInteger(count) || count < 1) count = 1;
  if (count > 25) count = 25;
  // "No" never adds to the headcount
  if (answer === "NO") count = 1;

  const jar = await cookies();
  let guestToken = jar.get(GUEST)?.value;
  if (!guestToken || guestToken.length < 8) guestToken = createId();

  const data = {
    displayName,
    answer: answer as "YES" | "MAYBE" | "NO",
    count,
    note: body.note ? String(body.note).trim().slice(0, 200) || null : null,
  };

  const existing = await prisma.rsvpResponse.findUnique({
    where: { rsvpId_guestToken: { rsvpId: rsvp.id, guestToken } },
    select: { id: true },
  });

  const response = await prisma.rsvpResponse.upsert({
    where: { rsvpId_guestToken: { rsvpId: rsvp.id, guestToken } },
    update: data,
    create: {
      id: createId(),
      rsvpId: rsvp.id,
      guestToken,
      ...data,
    },
  });

  // Notify the headcount's creator about new replies (not edits), off the
  // critical path so the guest never waits on SMTP.
  if (!existing) {
    const baseUrl = await getBaseUrl();
    after(() =>
      notifyRsvpReply({
        rsvpId: rsvp.id,
        responderName: displayName,
        answer: data.answer,
        count,
        baseUrl,
      })
    );
  }

  const res = NextResponse.json({
    response: {
      id: response.id,
      displayName: response.displayName,
      answer: response.answer,
      count: response.count,
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
