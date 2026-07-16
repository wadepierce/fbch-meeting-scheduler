import { NextRequest, NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugifyTitle } from "@/lib/meeting-poll";

/** List RSVP headcounts with response totals. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rsvps = await prisma.rsvp.findMany({
    orderBy: { startsAt: "asc" },
    include: { responses: { select: { answer: true, count: true } } },
  });

  return NextResponse.json({
    rsvps: rsvps.map((r) => {
      let yes = 0;
      let maybe = 0;
      let no = 0;
      for (const resp of r.responses) {
        if (resp.answer === "YES") yes += resp.count;
        else if (resp.answer === "MAYBE") maybe += resp.count;
        else no += resp.count;
      }
      return {
        id: r.id,
        slug: r.slug,
        title: r.title,
        location: r.location,
        startsAt: r.startsAt,
        endsAt: r.endsAt,
        timezone: r.timezone,
        status: r.status,
        pcoEventId: r.pcoEventId,
        pcoInstanceId: r.pcoInstanceId,
        replies: r.responses.length,
        yes,
        maybe,
        no,
      };
    }),
  });
}

/** Create an RSVP headcount page (from a PCO event or manually). */
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
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  const startsAtRaw = String(body.startsAt ?? "");
  const startsAt = new Date(startsAtRaw);
  if (!startsAtRaw || Number.isNaN(startsAt.getTime())) {
    return NextResponse.json(
      { error: "A valid start date/time is required" },
      { status: 400 }
    );
  }
  const endsAt =
    body.endsAt && !Number.isNaN(new Date(String(body.endsAt)).getTime())
      ? new Date(String(body.endsAt))
      : null;

  // If this PCO occurrence already has a headcount page, reuse it.
  const pcoInstanceId = body.pcoInstanceId
    ? String(body.pcoInstanceId)
    : null;
  if (pcoInstanceId) {
    const existing = await prisma.rsvp.findFirst({
      where: { pcoInstanceId },
    });
    if (existing) {
      return NextResponse.json({ rsvp: existing, existed: true });
    }
  }

  const base = slugifyTitle(title);
  let slug = base;
  let n = 0;
  while (await prisma.rsvp.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }

  const rsvp = await prisma.rsvp.create({
    data: {
      id: createId(),
      slug,
      title,
      description: body.description
        ? String(body.description).trim() || null
        : null,
      location: body.location ? String(body.location).trim() || null : null,
      startsAt,
      endsAt,
      timezone: String(body.timezone ?? "America/Chicago"),
      pcoEventId: body.pcoEventId ? String(body.pcoEventId) : null,
      pcoInstanceId,
      createdById: session.id,
    },
  });

  return NextResponse.json({ rsvp }, { status: 201 });
}
