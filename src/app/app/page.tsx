import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateRange } from "@/lib/meeting-poll";
import { formatViews } from "@/lib/format";
import AppHeader from "@/components/AppHeader";

export default async function AppHomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [meetings, passkeyCount] = await Promise.all([
    prisma.meeting.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { responses: true } } },
    }),
    prisma.credential.count({ where: { organizerId: session.id } }),
  ]);

  const statusColor: Record<string, string> = {
    DRAFT: "bg-card-muted text-ink-muted ring-1 ring-line",
    ACTIVE: "bg-accent-soft text-accent",
    CLOSED: "bg-brand-soft text-brand-text",
  };

  return (
    <>
      <AppHeader session={session} active="meetings" />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-text">
            Organizer
          </p>
          <h1 className="text-2xl font-bold text-ink">Your meetings</h1>
          <p className="mt-1 text-sm text-ink-subtle">
            Signed in as {session.name}
          </p>
        </div>

        {passkeyCount === 0 && (
          <Link
            href="/app/passkey"
            className="mt-5 flex items-center gap-3 rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 text-sm text-brand-text transition hover:border-brand/50"
          >
            <svg
              className="h-5 w-5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="10" cy="8" r="4" />
              <path d="M10 12c-3.3 0-6 2.2-6 5v1h8" />
              <circle cx="17.5" cy="14.5" r="2.5" />
              <path d="M17.5 17v4l-1.2-1-1.3 1v-2.2" />
            </svg>
            <span className="font-medium">
              Set up a passkey for faster, password-free sign-in →
            </span>
          </Link>
        )}

        <Link
          href="/app/new"
          className="mt-6 flex w-full items-center justify-center rounded-xl bg-brand px-4 py-3.5 text-sm font-semibold text-brand-contrast shadow-sm transition hover:bg-brand-strong"
        >
          + New availability poll
        </Link>

        <div className="mt-6 space-y-3">
          {meetings.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line bg-card p-8 text-center text-sm text-ink-subtle">
              No polls yet. Create one and share the link.
            </p>
          ) : (
            meetings.map((m) => (
              <Link
                key={m.id}
                href={`/app/${m.id}`}
                className="block rounded-xl border border-line bg-card p-4 shadow-sm transition hover:border-brand/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-ink">{m.title}</h2>
                    <p className="mt-0.5 text-xs text-ink-subtle">
                      {formatDateRange(m.dates)} · {m._count.responses} response
                      {m._count.responses === 1 ? "" : "s"} ·{" "}
                      {formatViews(m.viewCount)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColor[m.status]}`}
                  >
                    {m.status}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
    </>
  );
}
