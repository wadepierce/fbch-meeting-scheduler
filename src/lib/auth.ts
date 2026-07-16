import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

const COOKIE = "fbch_meeting_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
};

function secretKey() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET must be set (min 16 chars)");
  }
  return new TextEncoder().encode(s);
}

export async function hashPasscode(passcode: string): Promise<string> {
  return bcrypt.hash(passcode, 10);
}

export async function verifyPasscode(
  passcode: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(passcode, hash);
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      id: String(payload.id),
      email: String(payload.email),
      name: String(payload.name),
      isAdmin: Boolean(payload.isAdmin),
    };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const s = await getSession();
  if (!s) throw new Error("UNAUTHORIZED");
  return s;
}

/** Login with email + passcode. Bootstrap admin from env if DB empty. */
export async function loginWithPasscode(
  email: string,
  passcode: string
): Promise<SessionUser | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !passcode) return null;

  await ensureBootstrapOrganizer();

  const org = await prisma.organizer.findUnique({
    where: { email: normalized },
  });
  if (!org || !org.active) return null;
  const ok = await verifyPasscode(passcode, org.passcodeHash);
  if (!ok) return null;

  const user: SessionUser = {
    id: org.id,
    email: org.email,
    name: org.name,
    isAdmin: org.isAdmin,
  };
  await createSession(user);
  return user;
}

/**
 * First deploy: create admin from BOOTSTRAP_ADMIN_EMAIL + BOOTSTRAP_ADMIN_PASSCODE.
 */
export async function ensureBootstrapOrganizer(): Promise<void> {
  const count = await prisma.organizer.count();
  if (count > 0) return;

  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const passcode = process.env.BOOTSTRAP_ADMIN_PASSCODE;
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "Admin";
  if (!email || !passcode) {
    console.warn(
      "[auth] No organizers and BOOTSTRAP_ADMIN_* not set — create one via env"
    );
    return;
  }

  await prisma.organizer.create({
    data: {
      email,
      name,
      passcodeHash: await hashPasscode(passcode),
      isAdmin: true,
      active: true,
    },
  });
  console.log(`[auth] Bootstrap admin created: ${email}`);
}
