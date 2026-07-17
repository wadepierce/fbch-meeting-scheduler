import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

/**
 * Relying Party (RP) configuration for WebAuthn.
 *
 * The RP ID must equal the browser's hostname or be a registrable domain
 * suffix of it (e.g. `example.com` for `app.example.com`). Browsers reject
 * ceremonies when that rule fails with:
 *   "The RP ID … is invalid for this domain"
 *
 * Host resolution order for the RP ID:
 *   1. Request host (x-forwarded-host / host), port-stripped — matches the
 *      address bar when the proxy forwards correctly
 *   2. If that host is unusable (0.0.0.0, internal Railway DNS) → APP_URL
 *   3. Then RAILWAY_PUBLIC_DOMAIN
 *
 * We deliberately do NOT prefer APP_URL / RAILWAY_PUBLIC_DOMAIN when the
 * request host is already a real public name: those env values can name a
 * custom domain while the user is on the Railway default host (or vice
 * versa), which is exactly the "RP ID invalid for this domain" failure.
 *
 * Optional RP_ID is applied only when it is a valid suffix of the resolved
 * host (e.g. RP_ID=example.com while serving app.example.com).
 */
export const RP_NAME = "FBCH Meeting Scheduler";

export interface RelyingParty {
  rpID: string;
  rpName: string;
  /** All origins we're willing to accept a ceremony from. */
  origins: string[];
}

/** True when `rpId` may be used for a page on `hostname` (WebAuthn RP ID rule). */
export function isValidRpIdForHost(rpId: string, hostname: string): boolean {
  if (!rpId || !hostname) return false;
  const id = rpId.toLowerCase();
  const host = hostname.toLowerCase();
  if (id === host) return true;
  // Domain suffix: host is a subdomain of rpId (not a string suffix of a label).
  return host.endsWith(`.${id}`);
}

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/** Host values that cannot be a browser-facing WebAuthn RP ID. */
function isUnusablePublicHostname(hostname: string): boolean {
  if (!hostname) return true;
  const h = hostname.toLowerCase();
  return (
    h === "0.0.0.0" ||
    h === "::" ||
    h === "[::]" ||
    h.endsWith(".railway.internal")
  );
}

function hostnameFromUrl(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withScheme).hostname || null;
  } catch {
    return raw.split("/")[0]?.split(":")[0] || null;
  }
}

export async function getRelyingParty(): Promise<RelyingParty> {
  const h = await headers();
  const rawHost =
    h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  // A proxy may comma-join hosts; the port on an internal hop must not leak
  // into the RP ID or expected origin.
  const host = rawHost.split(",")[0].trim();
  let hostname = host.split(":")[0];

  const railway = process.env.RAILWAY_PUBLIC_DOMAIN?.trim().replace(/\/$/, "");
  const envOrigin = process.env.APP_URL?.trim().replace(/\/$/, "");
  const railwayHostname = railway?.split(":")[0] || null;
  const appHostname = hostnameFromUrl(envOrigin);

  // Behind Railway the raw Host can be 0.0.0.0:PORT with no useful
  // x-forwarded-host. Fall back to the configured public origin so passkeys
  // still get a browser-valid RP ID (must match the URL people open).
  if (isUnusablePublicHostname(hostname)) {
    hostname = appHostname || railwayHostname || hostname;
  }

  const isLocal = isLocalHostname(hostname);
  const proto =
    h.get("x-forwarded-proto")?.split(",")[0].trim() ||
    (isLocal ? "http" : "https");

  // Only honor RP_ID when it is a legal suffix of the resolved host.
  const configuredRpId = process.env.RP_ID?.trim();
  const rpID =
    configuredRpId && isValidRpIdForHost(configuredRpId, hostname)
      ? configuredRpId
      : hostname;

  // Accept every origin the app might legitimately be reached at, minus any
  // internal port. The browser's real origin must match one of these.
  // Keep localhost port from the original host header for local dev.
  const originFromRequest =
    isLocal && host.includes(":")
      ? `${proto}://${host}`
      : `${proto}://${hostname}`;
  const railwayOrigin = railwayHostname ? `https://${railwayHostname}` : null;

  const origins = Array.from(
    new Set(
      [originFromRequest, envOrigin, railwayOrigin].filter(
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
