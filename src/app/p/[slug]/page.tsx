import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { tallyQuestion, type QuestionShape } from "@/lib/polls";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import VoteClient from "@/components/VoteClient";
import PollResults from "@/components/PollResults";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const poll = await prisma.poll
    .findUnique({ where: { slug } })
    .catch(() => null);
  if (!poll) return { title: "FBCH Polls" };
  const description = "Tap to answer — it takes a few seconds.";
  const ogTitle = `${poll.title} · First Baptist Church Henrietta`;
  return {
    title: `${poll.title} · FBCH`,
    description,
    openGraph: { title: ogTitle, description },
    twitter: { card: "summary_large_image", title: ogTitle, description },
  };
}

export default async function PublicPollPage({ params }: Props) {
  const { slug } = await params;
  const poll = await prisma.poll.findUnique({
    where: { slug },
    include: {
      questions: { orderBy: { order: "asc" } },
      votes: { include: { answers: true } },
    },
  });
  if (!poll) notFound();

  const questions = poll.questions as unknown as QuestionShape[];
  const guestToken = (await cookies()).get("fbch_guest")?.value ?? null;
  const myVote = guestToken
    ? poll.votes.find((v) => v.guestToken === guestToken)
    : null;

  const allAnswers = poll.votes.flatMap((v) => v.answers);
  const tallies: Record<string, ReturnType<typeof tallyQuestion>> = {};
  for (const q of questions) {
    tallies[q.id] = tallyQuestion(q, allAnswers);
  }

  const closed = poll.status === "CLOSED";
  const showResults = closed || (poll.showResults && Boolean(myVote));

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-6">
      <div className="flex items-center justify-between">
        <Logo size="sm" />
        <ThemeToggle />
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-text">
          Quick poll
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink">{poll.title}</h1>
        {poll.description && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-ink-muted">
            {poll.description}
          </p>
        )}
        <p className="mt-2 text-xs text-ink-subtle">
          {poll.votes.length} response{poll.votes.length === 1 ? "" : "s"} so
          far
          {poll.collectNames ? "" : " · answers are anonymous"}
        </p>
      </div>

      <div className="mt-6">
        <VoteClient
          slug={poll.slug}
          closed={closed}
          collectNames={poll.collectNames}
          questions={questions}
          initial={
            myVote
              ? {
                  displayName: myVote.displayName,
                  answers: Object.fromEntries(
                    myVote.answers.map((a) => [
                      a.questionId,
                      {
                        selections: a.selections,
                        value: a.value,
                        otherText: a.otherText,
                      },
                    ])
                  ),
                }
              : null
          }
        />
      </div>

      {showResults && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-subtle">
            Results
          </h2>
          <PollResults questions={questions} tallies={tallies} />
        </div>
      )}

      <p className="mt-6 text-center text-xs text-ink-subtle">
        First Baptist Church Henrietta
      </p>
    </main>
  );
}
