import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createInvite, listInvites } from "@/lib/invites";
import { getBaseUrl } from "@/lib/base-url";

function inviteUrl(base: string, token: string): string {
  return `${base.replace(/\/$/, "")}/invite/${token}`;
}

/** List invites (admins only). */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const base = await getBaseUrl();
  const invites = await listInvites();
  return NextResponse.json({
    invites: invites.map((i) => ({
      id: i.id,
      email: i.email,
      name: i.name,
      isAdmin: i.isAdmin,
      acceptedAt: i.acceptedAt,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
      url: inviteUrl(base, i.token),
    })),
  });
}

/** Create an invite link (admins only). */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const invite = await createInvite({
      email: String(body.email ?? ""),
      name: String(body.name ?? ""),
      isAdmin: body.isAdmin === true,
      invitedById: session.id,
    });
    const base = await getBaseUrl();
    return NextResponse.json(
      {
        invite: {
          id: invite.id,
          email: invite.email,
          name: invite.name,
          isAdmin: invite.isAdmin,
          expiresAt: invite.expiresAt,
          url: inviteUrl(base, invite.token),
        },
      },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not create invite" },
      { status: 400 }
    );
  }
}
