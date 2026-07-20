import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { tallyRsvp, formatEventWhen } from "@/lib/rsvp";
import { isLikelyBot } from "@/lib/views";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import RsvpClient from "@/components/RsvpClient";

interface Props {
  params: Promise<{ slug: string; token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, token } = await params;
  const invitee = await prisma.rsvpInvitee
    .findFirst({
      where: { token, rsvp: { slug } },
      include: { rsvp: true },
    })
    .catch(() => null);
  if (!invitee) return { title: "FBCH Events" };
  const rsvp = invitee.rsvp;
  const description = `${formatEventWhen(rsvp.startsAt, rsvp.timezone)}${
    rsvp.location ? ` · ${rsvp.location}` : ""
  } — tap to RSVP so we can get a headcount.`;
  const ogTitle = `${rsvp.title} · First Baptist Church Henrietta`;
  return {
    title: `${rsvp.title} · FBCH`,
    description,
    openGraph: { title: ogTitle, description },
    twitter: { card: "summary_large_image", title: ogTitle, description },
    robots: { index: false, follow: false },
  };
}

export default async function PersonalRsvpPage({ params }: Props) {
  const { slug, token } = await params;
  const invitee = await prisma.rsvpInvitee.findFirst({
    where: { token, rsvp: { slug } },
    include: {
      rsvp: { include: { responses: true } },
      response: true,
    },
  });
  if (!invitee) notFound();

  const rsvp = invitee.rsvp;

  // Track real human opens of this personal link (skip link-preview bots).
  try {
    const h = await headers();
    if (!isLikelyBot(h.get("user-agent"))) {
      const now = new Date();
      await prisma.rsvpInvitee.update({
        where: { id: invitee.id },
        data: {
          openCount: { increment: 1 },
          lastOpenedAt: now,
          firstOpenedAt: invitee.firstOpenedAt ?? now,
        },
      });
    }
  } catch (err) {
    console.warn("[rsvp] personal open track failed", invitee.id, err);
  }

  const tally = tallyRsvp(rsvp.responses);
  const when = formatEventWhen(rsvp.startsAt, rsvp.timezone, rsvp.endsAt);
  const mine = invitee.response;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-6">
      <div className="flex items-center justify-between">
        <Logo size="sm" />
        <ThemeToggle />
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-text">
          Hi {invitee.firstName || invitee.displayName}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">{rsvp.title}</h1>
        <p className="mt-2 text-sm font-medium text-ink">{when}</p>
        {rsvp.location && (
          <p className="mt-0.5 text-sm text-ink-muted">{rsvp.location}</p>
        )}
        {rsvp.description && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-ink-muted">
            {rsvp.description}
          </p>
        )}
      </div>

      <div className="mt-6">
        <RsvpClient
          slug={rsvp.slug}
          closed={rsvp.status === "CLOSED"}
          inviteToken={invitee.token}
          nameLocked
          initial={{
            displayName: mine?.displayName ?? invitee.displayName,
            answer: mine?.answer ?? null,
            count: mine?.count ?? 1,
          }}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-card p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
          So far
        </p>
        <div className="mt-2 flex gap-6">
          <div>
            <p className="text-2xl font-bold text-accent">{tally.yes}</p>
            <p className="text-xs text-ink-subtle">coming</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-ink">{tally.maybe}</p>
            <p className="text-xs text-ink-subtle">maybe</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-ink-subtle">{tally.no}</p>
            <p className="text-xs text-ink-subtle">can&apos;t</p>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-ink-subtle">
        First Baptist Church Henrietta · 208 S. Graham St, Henrietta, TX
      </p>
    </main>
  );
}
