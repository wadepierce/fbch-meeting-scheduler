import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { getRelyingParty, stashChallenge } from "@/lib/webauthn";

/**
 * Start a usernameless passkey sign-in. We deliberately omit
 * `allowCredentials` so the browser offers every passkey for this site —
 * including "use a passkey from a nearby device" (QR), which is what lets
 * someone sign in on their desktop with the passkey on their phone.
 */
export async function POST() {
  const { rpID } = await getRelyingParty();

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
  });

  await stashChallenge("authenticate", options.challenge);
  return NextResponse.json(options);
}
