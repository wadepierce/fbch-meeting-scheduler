import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { prisma } from "@/lib/db";
import { getBaseUrl } from "@/lib/base-url";
import { notifyRsvpReply } from "@/lib/notify";
import { inviteeGuestToken } from "@/lib/rsvp";

interface Ctx {
  params: Promise<{ slug: string; token: string }>;
}

const ANSWERS = new Set(["YES", "MAYBE", "NO"]);

/** Save (or update) the RSVP for a personal invite link. */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const { slug, token } = await ctx.params;

  const invitee = await prisma.rsvpInvitee.findFirst({
    where: { token, rsvp: { slug } },
    include: { rsvp: true, response: { select: { id: true } } },
  });
  if (!invitee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (invitee.rsvp.status === "CLOSED") {
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

  // Personal links keep the roster name (guest can still tweak if we allow;
  // default to locked name from invitee).
  const displayName =
    String(body.displayName ?? "").trim() || invitee.displayName;
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
  if (answer === "NO") count = 1;

  const guestToken = inviteeGuestToken(invitee.id);
  const data = {
    displayName,
    answer: answer as "YES" | "MAYBE" | "NO",
    count,
    note: body.note ? String(body.note).trim().slice(0, 200) || null : null,
    inviteeId: invitee.id,
    guestToken,
  };

  const wasNew = !invitee.response;

  const response = invitee.response
    ? await prisma.rsvpResponse.update({
        where: { id: invitee.response.id },
        data,
      })
    : await prisma.rsvpResponse.create({
        data: {
          id: createId(),
          rsvpId: invitee.rsvpId,
          ...data,
        },
      });

  if (wasNew) {
    const baseUrl = await getBaseUrl();
    after(() =>
      notifyRsvpReply({
        rsvpId: invitee.rsvpId,
        responderName: displayName,
        answer: data.answer,
        count,
        baseUrl,
      })
    );
  }

  return NextResponse.json({
    response: {
      id: response.id,
      displayName: response.displayName,
      answer: response.answer,
      count: response.count,
    },
  });
}
