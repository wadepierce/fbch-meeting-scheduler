import { NextRequest, NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchPcoListPeople, fetchPcoLists } from "@/lib/planning-center";
import { newInviteeToken } from "@/lib/rsvp";

interface Ctx {
  params: Promise<{ id: string }>;
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

/**
 * Import (or refresh) people from a Planning Center People list onto this
 * headcount roster. Existing invitees with the same PCO person id are updated
 * (name/phone) without wiping texted/open/reply status. New people are added.
 * We never remove people who are no longer on the list (safe for mid-outreach).
 */
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

  const listId = String(body.listId ?? "").trim();
  if (!listId) {
    return NextResponse.json({ error: "listId is required" }, { status: 400 });
  }

  let listName = String(body.listName ?? "").trim() || null;
  let people;
  try {
    if (!listName) {
      const lists = await fetchPcoLists();
      listName = lists.find((l) => l.id === listId)?.name ?? null;
    }
    people = await fetchPcoListPeople(listId);
  } catch (e) {
    console.error("[invitees/import]", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Could not load list from Planning Center",
      },
      { status: 502 }
    );
  }

  const existing = await prisma.rsvpInvitee.findMany({
    where: { rsvpId: id, pcoPersonId: { not: null } },
    select: { id: true, pcoPersonId: true },
  });
  const byPco = new Map(
    existing
      .filter((e) => e.pcoPersonId)
      .map((e) => [e.pcoPersonId as string, e.id])
  );

  let added = 0;
  let updated = 0;

  for (const p of people) {
    const foundId = byPco.get(p.pcoPersonId);
    if (foundId) {
      await prisma.rsvpInvitee.update({
        where: { id: foundId },
        data: {
          firstName: p.firstName,
          lastName: p.lastName,
          displayName: p.displayName,
          // Only fill phone if we got one from PCO; don't wipe a manual fix
          ...(p.phone ? { phone: p.phone } : {}),
        },
      });
      updated += 1;
    } else {
      await prisma.rsvpInvitee.create({
        data: {
          id: createId(),
          rsvpId: id,
          pcoPersonId: p.pcoPersonId,
          firstName: p.firstName,
          lastName: p.lastName,
          displayName: p.displayName,
          phone: p.phone,
          token: newInviteeToken(),
        },
      });
      added += 1;
    }
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

  return NextResponse.json({
    ok: true,
    listId,
    listName,
    imported: people.length,
    added,
    updated,
    invitees: invitees.map(serializeInvitee),
  });
}
