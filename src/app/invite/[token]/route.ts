import { NextRequest, NextResponse } from "next/server";
import { acceptInvite } from "@/lib/invites";
import {
  createSessionToken,
  sessionCookieOptions,
  toSessionUser,
  SESSION_COOKIE,
} from "@/lib/auth";

/**
 * Opening an invite link signs the person in automatically and sends them to
 * passkey setup. Implemented as a Route Handler because it sets the session
 * cookie (not allowed during a page render) and then redirects.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;

  let result;
  try {
    result = await acceptInvite(token);
  } catch {
    return NextResponse.redirect(new URL("/invite/error?reason=server", req.url));
  }

  if (!result.ok) {
    return NextResponse.redirect(
      new URL(`/invite/error?reason=${result.reason}`, req.url)
    );
  }

  const jwt = await createSessionToken(toSessionUser(result.organizer));
  const res = NextResponse.redirect(new URL("/app/passkey?welcome=1", req.url));
  res.cookies.set(SESSION_COOKIE, jwt, sessionCookieOptions());
  return res;
}
