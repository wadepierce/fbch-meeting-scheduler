import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createId } from "@paralleldrive/cuid2";
import { prisma } from "@/lib/db";
import {
  validateAnswer,
  normalizeAnswer,
  type AnswerInput,
  type QuestionShape,
} from "@/lib/polls";

interface Ctx {
  params: Promise<{ slug: string }>;
}

const GUEST = "fbch_guest";

/**
 * Cast (or update) this device's ballot. The guest cookie both prevents
 * double voting — one ballot per device via the unique (pollId, guestToken)
 * constraint — and lets the same person change their answers later.
 */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const poll = await prisma.poll.findUnique({
    where: { slug },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!poll) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (poll.status === "CLOSED") {
    return NextResponse.json({ error: "This poll is closed" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let displayName: string | null = null;
  if (poll.collectNames) {
    displayName = String(body.displayName ?? "").trim().slice(0, 80);
    if (!displayName) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
  }

  const rawAnswers = Array.isArray(body.answers)
    ? (body.answers as AnswerInput[])
    : [];
  const byQuestion = new Map(rawAnswers.map((a) => [String(a.questionId), a]));

  // Every question must be answered and valid.
  const normalized: {
    questionId: string;
    selections: number[];
    value: number | null;
    otherText: string | null;
  }[] = [];
  for (const q of poll.questions) {
    const shape = q as unknown as QuestionShape;
    const a = byQuestion.get(q.id);
    if (!a) {
      return NextResponse.json(
        { error: `Please answer “${q.prompt}”` },
        { status: 400 }
      );
    }
    const err = validateAnswer(shape, a);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    normalized.push({ questionId: q.id, ...normalizeAnswer(shape, a) });
  }

  const jar = await cookies();
  let guestToken = jar.get(GUEST)?.value;
  if (!guestToken || guestToken.length < 8) guestToken = createId();

  // Upsert the ballot, replacing any previous answers from this device.
  const vote = await prisma.$transaction(async (tx) => {
    const v = await tx.pollVote.upsert({
      where: { pollId_guestToken: { pollId: poll.id, guestToken } },
      update: { displayName },
      create: {
        id: createId(),
        pollId: poll.id,
        guestToken,
        displayName,
      },
    });
    await tx.pollAnswer.deleteMany({ where: { voteId: v.id } });
    await tx.pollAnswer.createMany({
      data: normalized.map((n) => ({
        id: createId(),
        voteId: v.id,
        ...n,
      })),
    });
    return v;
  });

  const res = NextResponse.json({ ok: true, voteId: vote.id });
  res.cookies.set(GUEST, guestToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
