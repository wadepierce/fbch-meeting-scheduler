import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

/**
 * Relying Party (RP) configuration for WebAuthn.
 *
 * The RP ID must be a registrable suffix of the site's hostname and the
 * expected origin must match the page origin exactly, so we derive both from
 * the incoming request. Set RP_ID / APP_URL to override (e.g. when serving the
 * same app from several hostnames behind a proxy).
 */
export const RP_NAME = "FBCH Meeting Scheduler";

export interface RelyingParty {
  rpID: string;
  rpName: string;
  /** All origins we're willing to accept a ceremony from. */
  origins: string[];
}

export async function getRelyingParty(): Promise<RelyingParty> {
  const h = await headers();
  const rawHost =
    h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  // A proxy may comma-join hosts; the port on an internal hop must not leak
  // into the RP ID or expected origin.
  const host = rawHost.split(",")[0].trim();
  const hostname = host.split(":")[0];
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  const proto =
    h.get("x-forwarded-proto")?.split(",")[0].trim() ||
    (isLocal ? "http" : "https");

  const railway = process.env.RAILWAY_PUBLIC_DOMAIN?.trim().replace(/\/$/, "");
  const rpID = process.env.RP_ID?.trim() || railway?.split(":")[0] || hostname;

  // Accept every origin the app might legitimately be reached at, minus any
  // internal port. The browser's real origin must match one of these.
  const derivedOrigin = `${proto}://${isLocal ? host : hostname}`;
  const envOrigin = process.env.APP_URL?.trim().replace(/\/$/, "");
  const railwayOrigin = railway ? `https://${railway.split(":")[0]}` : null;

  const origins = Array.from(
    new Set(
      [derivedOrigin, envOrigin, railwayOrigin].filter(
        (o): o is string => Boolean(o)
      )
    )
  );

  return { rpID, rpName: RP_NAME, origins };
}

// ---------------------------------------------------------------------------
// Challenge storage
//
// WebAuthn is a two-step ceremony: the server issues a random challenge, then
// verifies the signed response against it. We keep the challenge in a signed,
// httpOnly, short-lived cookie so the flow stays stateless (no DB row to clean
// up) and can't be tampered with.
// ---------------------------------------------------------------------------

const CHALLENGE_COOKIE = "fbch_webauthn_chal";
const CHALLENGE_TTL_SECONDS = 300; // 5 minutes

function secretKey(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET must be set (min 16 chars)");
  }
  return new TextEncoder().encode(s);
}

export type ChallengeKind = "register" | "authenticate";

export async function stashChallenge(
  kind: ChallengeKind,
  challenge: string,
  /** For registration, pin the challenge to the signed-in organizer. */
  organizerId?: string
): Promise<void> {
  const token = await new SignJWT({ challenge, kind, organizerId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CHALLENGE_TTL_SECONDS}s`)
    .sign(secretKey());

  const jar = await cookies();
  jar.set(CHALLENGE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CHALLENGE_TTL_SECONDS,
  });
}

export async function readChallenge(kind: ChallengeKind): Promise<{
  challenge: string;
  organizerId?: string;
} | null> {
  const jar = await cookies();
  const token = jar.get(CHALLENGE_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.kind !== kind) return null;
    return {
      challenge: String(payload.challenge),
      organizerId: payload.organizerId
        ? String(payload.organizerId)
        : undefined,
    };
  } catch {
    return null;
  }
}

export async function clearChallenge(): Promise<void> {
  const jar = await cookies();
  jar.delete(CHALLENGE_COOKIE);
}
