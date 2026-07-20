import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface Ctx {
  params: Promise<{ id: string }>;
}

/** Open/close a headcount and/or update the per-person message template. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: { status?: "OPEN" | "CLOSED"; messageTemplate?: string | null } =
    {};

  if (body.status === "CLOSED" || body.status === "OPEN") {
    data.status = body.status;
  }
  if ("messageTemplate" in body) {
    const raw = body.messageTemplate;
    if (raw === null || raw === "") {
      data.messageTemplate = null;
    } else if (typeof raw === "string") {
      const t = raw.trim();
      if (t.length > 2000) {
        return NextResponse.json(
          { error: "Message template is too long (max 2000 characters)" },
          { status: 400 }
        );
      }
      data.messageTemplate = t || null;
    } else {
      return NextResponse.json(
        { error: "messageTemplate must be a string" },
        { status: 400 }
      );
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const rsvp = await prisma.rsvp.update({ where: { id }, data });
    return NextResponse.json({ rsvp });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

/** Delete a headcount and its responses. */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  try {
    await prisma.rsvp.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
