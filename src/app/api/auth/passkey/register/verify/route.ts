import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRelyingParty, readChallenge, clearChallenge } from "@/lib/webauthn";

/** Verify the enrollment response and store the new passkey. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { response?: unknown; label?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const stashed = await readChallenge("register");
  if (!stashed || stashed.organizerId !== session.id) {
    return NextResponse.json(
      { error: "That took too long — please try again." },
      { status: 400 }
    );
  }

  const label =
    typeof body.label === "string" ? body.label.trim().slice(0, 60) : "";

  const { rpID, origins } = await getRelyingParty();

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response: body.response as any,
      expectedChallenge: stashed.challenge,
      expectedOrigin: origins,
      expectedRPID: rpID,
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

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json(
      { error: "Could not register that passkey." },
      { status: 400 }
    );
  }

  const { credential, credentialBackedUp } = verification.registrationInfo;

  await prisma.credential.upsert({
    where: { credentialId: credential.id },
    update: {
      counter: credential.counter,
      lastUsedAt: new Date(),
    },
    create: {
      organizerId: session.id,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports ?? [],
      deviceLabel: label || null,
      backedUp: credentialBackedUp ?? false,
    },
  });

  return NextResponse.json({ ok: true });
}
