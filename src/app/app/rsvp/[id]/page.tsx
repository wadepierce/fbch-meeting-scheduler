import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBaseUrl } from "@/lib/base-url";
import { tallyRsvp, formatEventWhen, rsvpShareMessage } from "@/lib/rsvp";
import AppHeader from "@/components/AppHeader";
import ShareActions from "@/components/ShareActions";
import RsvpStatusButtons from "@/components/RsvpStatusButtons";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RsvpDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const rsvp = await prisma.rsvp.findUnique({
    where: { id },
    include: { responses: { orderBy: { updatedAt: "desc" } } },
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

        {/* Headcount summary */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-accent/40 bg-accent-soft p-4 text-center">
            <p className="text-3xl font-bold text-accent">{tally.yes}</p>
            <p className="mt-1 text-xs font-medium text-ink-muted">coming</p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-4 text-center">
            <p className="text-3xl font-bold text-ink">{tally.maybe}</p>
            <p className="mt-1 text-xs font-medium text-ink-muted">maybe</p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-4 text-center">
            <p className="text-3xl font-bold text-ink-subtle">{tally.no}</p>
            <p className="mt-1 text-xs font-medium text-ink-muted">can&apos;t</p>
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-ink-subtle">
          Plan for <span className="font-semibold text-ink">{tally.yes}</span>
          {tally.maybe > 0 ? ` (up to ${tally.yes + tally.maybe} with maybes)` : ""} ·{" "}
          {tally.replies} repl{tally.replies === 1 ? "y" : "ies"}
        </p>

        {/* Share */}
        <div className="mt-6 rounded-2xl border border-line bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">
            Text it out for a headcount
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            “Text it” opens your Messages app with this ready to send:
          </p>
          <p className="mt-2 rounded-lg bg-card-muted px-3 py-2 text-xs text-ink-muted ring-1 ring-line">
            {message}
          </p>
          <div className="mt-3">
            <ShareActions message={message} url={url} />
          </div>
        </div>

        {/* Responses */}
        <div className="mt-5 rounded-2xl border border-line bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">
            Responses ({rsvp.responses.length})
          </h2>
          {rsvp.responses.length === 0 ? (
            <p className="mt-2 text-sm text-ink-subtle">
              No replies yet — text the link out and they&apos;ll show up here.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {rsvp.responses.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {r.displayName}
                      {r.count > 1 && (
                        <span className="ml-1.5 text-xs font-normal text-ink-subtle">
                          ×{r.count}
                        </span>
                      )}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      r.answer === "YES"
                        ? "bg-accent-soft text-accent"
                        : r.answer === "MAYBE"
                          ? "bg-brand-soft text-brand-text"
                          : "bg-card-muted text-ink-subtle ring-1 ring-line"
                    }`}
                  >
                    {r.answer === "YES"
                      ? "Coming"
                      : r.answer === "MAYBE"
                        ? "Maybe"
                        : "Can't"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5">
          <RsvpStatusButtons id={rsvp.id} status={rsvp.status} />
        </div>
      </main>
    </>
  );
}
