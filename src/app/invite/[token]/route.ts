import { NextRequest, NextResponse } from "next/server";
import { acceptInvite } from "@/lib/invites";
import { getBaseUrl } from "@/lib/base-url";
import {
  createSessionToken,
  sessionCookieOptions,
  toSessionUser,
  recordOrganizerSignIn,
  SESSION_COOKIE,
} from "@/lib/auth";

/**
 * Opening an invite link signs the person in automatically and sends them to
 * passkey setup. Implemented as a Route Handler because it sets the session
 * cookie (not allowed during a page render) and then redirects.
 *
 * Redirect targets are built against getBaseUrl() — the same canonical origin
 * the invite link itself was generated with — never `req.url`. Behind a proxy
 * that forwards an internal port with no x-forwarded-host, `req.url` carries
 * that port (e.g. https://host:6666/…); redirecting against it would hand the
 * browser a "restricted port" URL (ERR_UNSAFE_PORT) and break the invite the
 * moment someone opens the link.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;
  const base = await getBaseUrl();

  let result;
  try {
    result = await acceptInvite(token);
  } catch {
    return NextResponse.redirect(new URL("/invite/error?reason=server", base));
  }

  if (!result.ok) {
    return NextResponse.redirect(
      new URL(`/invite/error?reason=${result.reason}`, base)
    );
  }

  const jwt = await createSessionToken(toSessionUser(result.organizer));
  await recordOrganizerSignIn(result.organizer.id);
  const res = NextResponse.redirect(new URL("/app/passkey?welcome=1", base));
  res.cookies.set(SESSION_COOKIE, jwt, sessionCookieOptions());
  return res;
}
