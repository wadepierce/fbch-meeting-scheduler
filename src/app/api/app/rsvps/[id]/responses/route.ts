import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * Delete shared-link / detached replies that are not tied to the roster, so
 * the big Coming/Maybe/Can't totals match the attendance roll again.
 *
 * Body:
 *   { allOrphans: true }           — wipe every unlinked reply
 *   { responseIds: string[] }      — wipe specific reply ids (must belong to this rsvp, no invitee)
 */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rsvpId } = await ctx.params;
  const rsvp = await prisma.rsvp.findUnique({
    where: { id: rsvpId },
    select: { id: true },
  });
  if (!rsvp) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (body.allOrphans === true) {
    const result = await prisma.rsvpResponse.deleteMany({
      where: { rsvpId, inviteeId: null },
    });
    return NextResponse.json({ ok: true, deleted: result.count });
  }

  const ids = Array.isArray(body.responseIds)
    ? body.responseIds.map((x) => String(x)).filter(Boolean)
    : body.responseId
      ? [String(body.responseId)]
      : [];

  if (ids.length === 0) {
    return NextResponse.json(
      { error: "Pass allOrphans: true or responseIds: [...]" },
      { status: 400 }
    );
  }

  const result = await prisma.rsvpResponse.deleteMany({
    where: {
      rsvpId,
      inviteeId: null,
      id: { in: ids },
    },
  });

  return NextResponse.json({ ok: true, deleted: result.count });
}
