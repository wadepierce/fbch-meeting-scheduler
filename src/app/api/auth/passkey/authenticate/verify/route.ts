import { NextRequest, NextResponse } from "next/server";
import {
  verifyAuthenticationResponse,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { prisma } from "@/lib/db";
import { getRelyingParty, readChallenge, clearChallenge } from "@/lib/webauthn";
import { signInOrganizer } from "@/lib/auth";

/** Verify a passkey assertion and open a session. */
export async function POST(req: NextRequest) {
  let body: { response?: { id?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const credentialId = body.response?.id;
  if (!credentialId) {
    return NextResponse.json({ error: "Missing passkey" }, { status: 400 });
  }

  const stashed = await readChallenge("authenticate");
  if (!stashed) {
    return NextResponse.json(
      { error: "That took too long — please try again." },
      { status: 400 }
    );
  }

  const cred = await prisma.credential.findUnique({
    where: { credentialId },
    include: { organizer: true },
  });
  if (!cred || !cred.organizer.active) {
    await clearChallenge();
    return NextResponse.json(
      { error: "That passkey isn't recognized." },
      { status: 400 }
    );
  }

  const { rpID, origins } = await getRelyingParty();

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response: body.response as any,
      expectedChallenge: stashed.challenge,
      expectedOrigin: origins,
      expectedRPID: rpID,
      credential: {
        id: cred.credentialId,
        publicKey: cred.publicKey,
        counter: cred.counter,
        transports: cred.transports as AuthenticatorTransportFuture[],
      },
      requireUserVerification: false,
    });
  } catch (e) {
    await clearChallenge();
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Verification failed" },
      { status: 400 }
    );
  }
  await clearChallenge();

  if (!verification.verified) {
    return NextResponse.json(
      { error: "Passkey verification failed." },
      { status: 400 }
    );
  }

  await prisma.credential.update({
    where: { id: cred.id },
    data: {
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: new Date(),
    },
  });

  const user = await signInOrganizer(cred.organizer);
  return NextResponse.json({ user });
}
