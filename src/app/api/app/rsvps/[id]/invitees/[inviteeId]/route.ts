import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { splitDisplayName } from "@/lib/rsvp";

interface Ctx {
  params: Promise<{ id: string; inviteeId: string }>;
}

function serializeInvitee(inv: {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string | null;
  token: string;
  textedAt: Date | null;
  firstOpenedAt: Date | null;
  lastOpenedAt: Date | null;
  openCount: number;
  pcoPersonId: string | null;
  createdAt: Date;
  response: {
    id: string;
    answer: string;
    count: number;
    updatedAt: Date;
  } | null;
}) {
  return {
    id: inv.id,
    firstName: inv.firstName,
    lastName: inv.lastName,
    displayName: inv.displayName,
    phone: inv.phone,
    token: inv.token,
    textedAt: inv.textedAt?.toISOString() ?? null,
    firstOpenedAt: inv.firstOpenedAt?.toISOString() ?? null,
    lastOpenedAt: inv.lastOpenedAt?.toISOString() ?? null,
    openCount: inv.openCount,
    pcoPersonId: inv.pcoPersonId,
    createdAt: inv.createdAt.toISOString(),
    response: inv.response
      ? {
          id: inv.response.id,
          answer: inv.response.answer,
          count: inv.response.count,
          updatedAt: inv.response.updatedAt.toISOString(),
        }
      : null,
  };
}

/** Update an invitee (name/phone) or mark texted. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, inviteeId } = await ctx.params;
  const existing = await prisma.rsvpInvitee.findFirst({
    where: { id: inviteeId, rsvpId: id },
    include: {
      response: {
        select: { id: true, answer: true, count: true, updatedAt: true },
      },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    phone?: string | null;
    textedAt?: Date | null;
  } = {};

  if (body.markTexted === true) {
    data.textedAt = new Date();
  }
  if (body.markTexted === false || body.clearTexted === true) {
    data.textedAt = null;
  }

  if (typeof body.firstName === "string" || typeof body.name === "string") {
    let firstName =
      typeof body.firstName === "string" ? body.firstName.trim() : "";
    let lastName =
      typeof body.lastName === "string"
        ? body.lastName.trim()
        : existing.lastName;
    if (!firstName && typeof body.name === "string") {
      const split = splitDisplayName(body.name);
      firstName = split.firstName;
      lastName = split.lastName;
    }
    if (!firstName || firstName.length > 80) {
      return NextResponse.json(
        { error: "First name is required (max 80 characters)" },
        { status: 400 }
      );
    }
    data.firstName = firstName;
    data.lastName = lastName.slice(0, 80);
    data.displayName =
      (typeof body.displayName === "string" && body.displayName.trim()) ||
      [firstName, data.lastName].filter(Boolean).join(" ");
  } else if (typeof body.lastName === "string") {
    data.lastName = body.lastName.trim().slice(0, 80);
    data.displayName = [existing.firstName, data.lastName]
      .filter(Boolean)
      .join(" ");
  }

  if ("phone" in body) {
    if (body.phone === null || body.phone === "") {
      data.phone = null;
    } else if (typeof body.phone === "string") {
      data.phone = body.phone.trim().slice(0, 40) || null;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const invitee = await prisma.rsvpInvitee.update({
    where: { id: inviteeId },
    data,
    include: {
      response: {
        select: { id: true, answer: true, count: true, updatedAt: true },
      },
    },
  });

  return NextResponse.json({ invitee: serializeInvitee(invitee) });
}

/** Remove someone from the roster (keeps anonymous responses). */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, inviteeId } = await ctx.params;
  const existing = await prisma.rsvpInvitee.findFirst({
    where: { id: inviteeId, rsvpId: id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Detach response first so onDelete SetNull isn't the only path;
  // response stays in headcount totals as a named reply.
  await prisma.rsvpResponse.updateMany({
    where: { inviteeId },
    data: { inviteeId: null },
  });
  await prisma.rsvpInvitee.delete({ where: { id: inviteeId } });

  return NextResponse.json({ ok: true });
}
