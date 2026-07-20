import { NextRequest, NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { newInviteeToken, splitDisplayName } from "@/lib/rsvp";
import { serializeInvitee } from "@/lib/rsvp-invitee";

interface Ctx {
  params: Promise<{ id: string }>;
}

/** List roster invitees for a headcount. */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const rsvp = await prisma.rsvp.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!rsvp) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const invitees = await prisma.rsvpInvitee.findMany({
    where: { rsvpId: id },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      response: {
        select: { id: true, answer: true, count: true, updatedAt: true },
      },
    },
  });

  return NextResponse.json({ invitees: invitees.map(serializeInvitee) });
}

/** Add one person to the roster (manual). */
export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const rsvp = await prisma.rsvp.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!rsvp) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let firstName = String(body.firstName ?? "").trim();
  let lastName = String(body.lastName ?? "").trim();
  const nameRaw = String(body.name ?? body.displayName ?? "").trim();

  if (!firstName && nameRaw) {
    const split = splitDisplayName(nameRaw);
    firstName = split.firstName;
    lastName = split.lastName || lastName;
  }

  if (!firstName || firstName.length > 80) {
    return NextResponse.json(
      { error: "First name is required (max 80 characters)" },
      { status: 400 }
    );
  }
  if (lastName.length > 80) {
    return NextResponse.json(
      { error: "Last name is too long (max 80 characters)" },
      { status: 400 }
    );
  }

  const displayName =
    String(body.displayName ?? "").trim() ||
    [firstName, lastName].filter(Boolean).join(" ");

  const phoneRaw = body.phone != null ? String(body.phone).trim() : "";
  const phone = phoneRaw ? phoneRaw.slice(0, 40) : null;

  const invitee = await prisma.rsvpInvitee.create({
    data: {
      id: createId(),
      rsvpId: id,
      firstName,
      lastName,
      displayName,
      phone,
      token: newInviteeToken(),
      pcoPersonId: body.pcoPersonId
        ? String(body.pcoPersonId).slice(0, 64)
        : null,
      addedById: session.id,
      addedByName: session.name,
    },
    include: {
      response: {
        select: { id: true, answer: true, count: true, updatedAt: true },
      },
    },
  });

  return NextResponse.json(
    { invitee: serializeInvitee(invitee) },
    { status: 201 }
  );
}
