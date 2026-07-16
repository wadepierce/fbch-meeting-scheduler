import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { revokeInvite } from "@/lib/invites";

interface Ctx {
  params: Promise<{ id: string }>;
}

/** Revoke a pending invite (admins only). */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const { id } = await ctx.params;
  try {
    await revokeInvite(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
