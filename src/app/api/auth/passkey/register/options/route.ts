import { NextResponse } from "next/server";
import {
  generateRegistrationOptions,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRelyingParty, stashChallenge } from "@/lib/webauthn";

/** Start passkey enrollment for the signed-in organizer. */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rpID, rpName } = await getRelyingParty();
  const existing = await prisma.credential.findMany({
    where: { organizerId: session.id },
    select: { credentialId: true, transports: true },
  });

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: session.email,
    userDisplayName: session.name,
    userID: new TextEncoder().encode(session.id),
    attestationType: "none",
    // Don't offer the same authenticator twice.
    excludeCredentials: existing.map((c) => ({
      id: c.credentialId,
      transports: c.transports as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      // Discoverable (resident) key => usernameless + cross-device sign-in.
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  await stashChallenge("register", options.challenge, session.id);
  return NextResponse.json(options);
}
