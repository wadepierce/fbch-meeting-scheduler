import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** List the signed-in organizer's passkeys. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const credentials = await prisma.credential.findMany({
    where: { organizerId: session.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      deviceLabel: true,
      backedUp: true,
      createdAt: true,
      lastUsedAt: true,
      transports: true,
    },
  });

  return NextResponse.json({ credentials });
}
