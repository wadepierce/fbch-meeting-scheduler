import { createId } from "@paralleldrive/cuid2";
import { prisma } from "./db";

/** How long an invite link stays valid after it's created. */
export const INVITE_TTL_DAYS = 14;

function randomToken(): string {
  // Two cuids ≈ 48 url-safe chars of entropy — plenty for an invite link.
  return `${createId()}${createId()}`;
}

export interface CreateInviteInput {
  email: string;
  name: string;
  isAdmin?: boolean;
  invitedById?: string | null;
}

export async function createInvite(input: CreateInviteInput) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("A valid email is required");
  }
  if (!name) throw new Error("A name is required");

  const expiresAt = new Date(
    Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  return prisma.invite.create({
    data: {
      id: createId(),
      token: randomToken(),
      email,
      name,
      isAdmin: input.isAdmin ?? false,
      invitedById: input.invitedById ?? null,
      expiresAt,
    },
  });
}

export type AcceptResult =
  | { ok: true; organizer: { id: string; email: string; name: string; isAdmin: boolean } }
  | { ok: false; reason: "not-found" | "expired" };

/**
 * Accept an invite token: provision (or reuse) the Organizer and mark the
 * invite accepted. Idempotent — clicking the link again re-signs the same
 * person in, which is what makes it a personal magic link.
 */
export async function acceptInvite(token: string): Promise<AcceptResult> {
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite) return { ok: false, reason: "not-found" };
  if (invite.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  // Reuse an existing organizer with this email, else create one.
  const organizer = await prisma.organizer.upsert({
    where: { email: invite.email },
    update: { active: true, ...(invite.isAdmin ? { isAdmin: true } : {}) },
    create: {
      id: createId(),
      email: invite.email,
      name: invite.name,
      isAdmin: invite.isAdmin,
      active: true,
      passcodeHash: null,
    },
  });

  await prisma.invite.update({
    where: { id: invite.id },
    data: {
      organizerId: organizer.id,
      acceptedAt: invite.acceptedAt ?? new Date(),
    },
  });

  return {
    ok: true,
    organizer: {
      id: organizer.id,
      email: organizer.email,
      name: organizer.name,
      isAdmin: organizer.isAdmin,
    },
  };
}

export async function listInvites() {
  return prisma.invite.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeInvite(id: string) {
  await prisma.invite.delete({ where: { id } });
}
