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

/**
 * Save (or update) the RSVP for a personal invite link.
 *
 * Always replaces a single response for this invitee — never stacks a second
 * row (which would double-count party size in the headcount totals).
 */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const { slug, token } = await ctx.params;

  const invitee = await prisma.rsvpInvitee.findFirst({
    where: { token, rsvp: { slug } },
    include: { rsvp: true },
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

  const rosterName =
    invitee.displayName?.trim() ||
    [invitee.firstName, invitee.lastName].filter(Boolean).join(" ").trim() ||
    invitee.firstName?.trim() ||
    "";

  // Personal links always use the roster name (prefilled / locked on the page).
  const displayName =
    String(body.displayName ?? "").trim() || rosterName;
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
  if (!Number.isFinite(count)) count = 1;
  count = Math.floor(count);
  if (count < 1) count = 1;
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

  // Prefer the invitee-linked row, then the stable personal guestToken.
  // Also reclaim a same-name shared-link reply so we don't stack 3+4=7.
  const candidates = await prisma.rsvpResponse.findMany({
    where: {
      rsvpId: invitee.rsvpId,
      OR: [
        { inviteeId: invitee.id },
        { guestToken },
        {
          inviteeId: null,
          displayName: { equals: displayName, mode: "insensitive" },
        },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });

  const primary =
    candidates.find((c) => c.inviteeId === invitee.id) ||
    candidates.find((c) => c.guestToken === guestToken) ||
    candidates[0] ||
    null;

  const wasNew = !primary;

  const response = primary
    ? await prisma.rsvpResponse.update({
        where: { id: primary.id },
        data,
      })
    : await prisma.rsvpResponse.create({
        data: {
          id: createId(),
          rsvpId: invitee.rsvpId,
          ...data,
        },
      });

  // Drop any leftover duplicates for this person (old shared + personal rows).
  const extras = candidates.filter((c) => c.id !== response.id);
  if (extras.length > 0) {
    await prisma.rsvpResponse.deleteMany({
      where: { id: { in: extras.map((c) => c.id) } },
    });
  }

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
