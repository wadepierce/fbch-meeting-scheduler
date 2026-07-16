import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface Ctx {
  params: Promise<{ id: string }>;
}

/** Open/close a headcount. */
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

  const status = body.status === "CLOSED" ? "CLOSED" : "OPEN";
  try {
    const rsvp = await prisma.rsvp.update({ where: { id }, data: { status } });
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
