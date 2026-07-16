import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isEmailConfigured } from "@/lib/email";

/** The signed-in organizer's own notification preferences. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.organizer.findUnique({
    where: { id: session.id },
    select: {
      email: true,
      notifyPollResponses: true,
      notifyRsvpReplies: true,
    },
  });
  if (!org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    emailEnabled: isEmailConfigured(),
    prefs: org,
  });
}

/** Update the signed-in organizer's notification preferences. */
export async function PATCH(req: NextRequest) {
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

  const data: Record<string, boolean> = {};
  if (typeof body.notifyPollResponses === "boolean") {
    data.notifyPollResponses = body.notifyPollResponses;
  }
  if (typeof body.notifyRsvpReplies === "boolean") {
    data.notifyRsvpReplies = body.notifyRsvpReplies;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const org = await prisma.organizer.update({
    where: { id: session.id },
    data,
    select: {
      email: true,
      notifyPollResponses: true,
      notifyRsvpReplies: true,
    },
  });

  return NextResponse.json({ prefs: org });
}
