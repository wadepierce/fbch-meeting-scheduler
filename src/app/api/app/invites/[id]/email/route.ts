import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBaseUrl } from "@/lib/base-url";
import { isEmailConfigured, sendEmail, inviteEmailContent } from "@/lib/email";

interface Ctx {
  params: Promise<{ id: string }>;
}

/** (Re)send the invite email for an existing invite (admins only). */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Email isn't set up. Copy the link instead." },
      { status: 400 }
    );
  }

  const { id } = await ctx.params;
  const invite = await prisma.invite.findUnique({ where: { id } });
  if (!invite) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const base = await getBaseUrl();
  const url = `${base.replace(/\/$/, "")}/invite/${invite.token}`;
  const content = inviteEmailContent({
    name: invite.name,
    url,
    invitedByName: session.name,
  });
  const res = await sendEmail({
    to: invite.email,
    replyTo: session.email,
    ...content,
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: res.error || "Could not send email" },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
