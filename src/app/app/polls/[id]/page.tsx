import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBaseUrl } from "@/lib/base-url";
import {
  tallyQuestion,
  pollShareMessage,
  type QuestionShape,
} from "@/lib/polls";
import { formatViews } from "@/lib/format";
import AppHeader from "@/components/AppHeader";
import ShareActions from "@/components/ShareActions";
import PollResults from "@/components/PollResults";
import PollStatusButtons from "@/components/PollStatusButtons";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PollDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const poll = await prisma.poll.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      votes: {
        orderBy: { updatedAt: "desc" },
        include: { answers: true },
      },
    },
  });
  if (!poll) notFound();

  const questions = poll.questions as unknown as QuestionShape[];
  const allAnswers = poll.votes.flatMap((v) => v.answers);
  const tallies: Record<string, ReturnType<typeof tallyQuestion>> = {};
  for (const q of questions) {
    tallies[q.id] = tallyQuestion(q, allAnswers);
  }

  const base = await getBaseUrl();
  const url = `${base.replace(/\/$/, "")}/p/${poll.slug}`;
  const message = pollShareMessage(poll.title, url);

  return (
    <>
      <AppHeader session={session} active="polls" />
      <main className="mx-auto max-w-lg px-4 py-8">
        <Link
          href="/app/polls"
          className="text-sm font-medium text-brand-text hover:underline"
        >
          ← Polls
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-ink">{poll.title}</h1>
            <p className="mt-1 text-sm text-ink-subtle">
              {poll.votes.length} response{poll.votes.length === 1 ? "" : "s"}
              {" · "}
              {formatViews(poll.viewCount)}
              {poll.collectNames ? "" : " · anonymous"}
              {poll.showResults ? "" : " · results hidden from voters"}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
              poll.status === "OPEN"
                ? "bg-accent-soft text-accent"
                : "bg-card-muted text-ink-subtle ring-1 ring-line"
            }`}
          >
            {poll.status}
          </span>
        </div>

        {/* Share */}
        <div className="mt-6 rounded-2xl border border-line bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Text it out</h2>
          <p className="mt-2 rounded-lg bg-card-muted px-3 py-2 text-xs text-ink-muted ring-1 ring-line">
            {message}
          </p>
          <div className="mt-3">
            <ShareActions message={message} url={url} />
          </div>
        </div>

        {/* Results */}
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-subtle">
            Results
          </h2>
          {poll.votes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line bg-card p-6 text-center text-sm text-ink-subtle">
              No answers yet — text the link out and results will fill in live.
            </p>
          ) : (
            <PollResults questions={questions} tallies={tallies} />
          )}
        </div>

        {/* Voters */}
        {poll.collectNames && poll.votes.length > 0 && (
          <div className="mt-5 rounded-2xl border border-line bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-ink">
              Who answered ({poll.votes.length})
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              {poll.votes
                .map((v) => v.displayName || "Anonymous")
                .join(", ")}
            </p>
          </div>
        )}

        <div className="mt-5">
          <PollStatusButtons id={poll.id} status={poll.status} />
        </div>
      </main>
    </>
  );
}
