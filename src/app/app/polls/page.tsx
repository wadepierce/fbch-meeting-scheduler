import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatViews } from "@/lib/format";
import AppHeader from "@/components/AppHeader";

export default async function PollsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const polls = await prisma.poll.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { votes: true, questions: true } } },
  });

  return (
    <>
      <AppHeader session={session} active="polls" />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-text">
          Quick polls
        </p>
        <h1 className="text-2xl font-bold text-ink">Polls</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Ratings, scales, this-or-that, and multiple choice — text a link,
          get answers. One vote per device.
        </p>

        <Link
          href="/app/polls/new"
          className="mt-6 flex w-full items-center justify-center rounded-xl bg-brand px-4 py-3.5 text-sm font-semibold text-brand-contrast shadow-sm transition hover:bg-brand-strong"
        >
          + New poll
        </Link>

        <div className="mt-6 space-y-3">
          {polls.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line bg-card p-8 text-center text-sm text-ink-subtle">
              No polls yet. Create one and text the link out.
            </p>
          ) : (
            polls.map((p) => (
              <Link
                key={p.id}
                href={`/app/polls/${p.id}`}
                className="block rounded-xl border border-line bg-card p-4 shadow-sm transition hover:border-brand/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-ink">
                      {p.title}
                    </h2>
                    <p className="mt-0.5 text-xs text-ink-subtle">
                      {p._count.questions} question
                      {p._count.questions === 1 ? "" : "s"} ·{" "}
                      {p._count.votes} response
                      {p._count.votes === 1 ? "" : "s"} ·{" "}
                      {formatViews(p.viewCount)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      p.status === "OPEN"
                        ? "bg-accent-soft text-accent"
                        : "bg-card-muted text-ink-subtle ring-1 ring-line"
                    }`}
                  >
                    {p.status}
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
