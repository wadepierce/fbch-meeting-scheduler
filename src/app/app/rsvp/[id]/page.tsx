import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBaseUrl } from "@/lib/base-url";
import { isPcoConfigured } from "@/lib/planning-center";
import { tallyRsvp, formatEventWhen, rsvpShareMessage } from "@/lib/rsvp";
import AppHeader from "@/components/AppHeader";
import ShareActions from "@/components/ShareActions";
import RsvpStatusButtons from "@/components/RsvpStatusButtons";
import RsvpRoster, { type RosterInvitee } from "@/components/RsvpRoster";
import OtherReplies from "@/components/OtherReplies";
import HeadcountTotals from "@/components/HeadcountTotals";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RsvpDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const rsvp = await prisma.rsvp.findUnique({
    where: { id },
    include: {
      responses: { orderBy: { updatedAt: "desc" } },
      invitees: {
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        include: {
          response: {
            select: { id: true, answer: true, count: true, updatedAt: true },
          },
        },
      },
    },
  });
  if (!rsvp) notFound();

  const base = await getBaseUrl();
  const url = `${base.replace(/\/$/, "")}/r/${rsvp.slug}`;
  const when = formatEventWhen(rsvp.startsAt, rsvp.timezone, rsvp.endsAt);
  const tally = tallyRsvp(rsvp.responses);
  const message = rsvpShareMessage({
    title: rsvp.title,
    when,
    location: rsvp.location,
    url,
  });

  const invitees: RosterInvitee[] = rsvp.invitees.map((inv) => ({
    id: inv.id,
    firstName: inv.firstName,
    lastName: inv.lastName,
    displayName: inv.displayName,
    phone: inv.phone,
    token: inv.token,
    textedAt: inv.textedAt?.toISOString() ?? null,
    textedById: inv.textedById ?? null,
    textedByName: inv.textedByName ?? null,
    firstOpenedAt: inv.firstOpenedAt?.toISOString() ?? null,
    lastOpenedAt: inv.lastOpenedAt?.toISOString() ?? null,
    openCount: inv.openCount,
    addedById: inv.addedById ?? null,
    addedByName: inv.addedByName ?? null,
    response: inv.response
      ? {
          id: inv.response.id,
          answer: inv.response.answer,
          count: inv.response.count,
          updatedAt: inv.response.updatedAt.toISOString(),
        }
      : null,
  }));

  // Anonymous / shared-link replies not tied to the roster
  const rosterResponseIds = new Set(
    rsvp.invitees.map((i) => i.response?.id).filter(Boolean) as string[]
  );
  const orphanResponses = rsvp.responses.filter(
    (r) => !rosterResponseIds.has(r.id)
  );

  return (
    <>
      <AppHeader session={session} active="events" />
      <main className="mx-auto max-w-lg px-4 py-8">
        <Link
          href="/app/events"
          className="text-sm font-medium text-brand-text hover:underline"
        >
          ← Events
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">{rsvp.title}</h1>
            <p className="mt-1 text-sm text-ink-muted">{when}</p>
            {rsvp.location && (
              <p className="text-sm text-ink-subtle">{rsvp.location}</p>
            )}
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
              rsvp.status === "OPEN"
                ? "bg-accent-soft text-accent"
                : "bg-card-muted text-ink-subtle ring-1 ring-line"
            }`}
          >
            {rsvp.status}
          </span>
        </div>

        <HeadcountTotals
          rsvpId={rsvp.id}
          tally={tally}
          viewCount={rsvp.viewCount}
          orphanCount={orphanResponses.length}
          rosterComing={invitees
            .filter((i) => i.response?.answer === "YES")
            .reduce((n, i) => n + (i.response?.count ?? 0), 0)}
        />

        {/* Shared link (group text / posts) */}
        <div className="mt-6 rounded-2xl border border-line bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">
            Shared link (group text)
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            One link for everyone — fine for a group chat. For tracking who
            opened, use the personal list below.
          </p>
          <p className="mt-2 rounded-lg bg-card-muted px-3 py-2 text-xs text-ink-muted ring-1 ring-line">
            {message}
          </p>
          <div className="mt-3">
            <ShareActions message={message} url={url} />
          </div>
        </div>

        {/* Personal roster */}
        <div className="mt-5">
          <RsvpRoster
            rsvpId={rsvp.id}
            slug={rsvp.slug}
            publicBase={base}
            title={rsvp.title}
            when={when}
            location={rsvp.location}
            initialTemplate={rsvp.messageTemplate}
            initialInvitees={invitees}
            closed={rsvp.status === "CLOSED"}
            pcoConfigured={isPcoConfigured()}
            currentUserName={session.name}
          />
        </div>

        <OtherReplies
          rsvpId={rsvp.id}
          replies={orphanResponses.map((r) => ({
            id: r.id,
            displayName: r.displayName,
            answer: r.answer,
            count: r.count,
          }))}
        />

        <div className="mt-5">
          <RsvpStatusButtons id={rsvp.id} status={rsvp.status} />
        </div>
      </main>
    </>
  );
}
