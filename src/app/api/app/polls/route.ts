import { NextRequest, NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugifyTitle } from "@/lib/meeting-poll";
import type { QuestionKind } from "@/lib/polls";

const KINDS = new Set(["CHOICE", "MULTI", "THIS_OR_THAT", "RATING", "SCALE"]);

/** List quick polls with vote counts. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const polls = await prisma.poll.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { votes: true, questions: true } },
    },
  });

  return NextResponse.json({
    polls: polls.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      status: p.status,
      createdAt: p.createdAt,
      votes: p._count.votes,
      questions: p._count.questions,
    })),
  });
}

interface QuestionBody {
  kind?: unknown;
  prompt?: unknown;
  options?: unknown;
  scaleMin?: unknown;
  scaleMax?: unknown;
  minLabel?: unknown;
  maxLabel?: unknown;
  allowOther?: unknown;
}

interface ParsedQuestion {
  id: string;
  order: number;
  kind: QuestionKind;
  prompt: string;
  options: string[];
  scaleMin: number | null;
  scaleMax: number | null;
  minLabel: string | null;
  maxLabel: string | null;
  allowOther: boolean;
}

function parseQuestion(
  raw: QuestionBody,
  order: number
): { ok: true; data: ParsedQuestion } | { ok: false; error: string } {
  const kind = String(raw.kind ?? "") as QuestionKind;
  const prompt = String(raw.prompt ?? "").trim().slice(0, 300);
  if (!KINDS.has(kind)) return { ok: false, error: "Unknown question type" };
  if (!prompt) return { ok: false, error: "Every question needs a prompt" };

  let options = Array.isArray(raw.options)
    ? (raw.options as unknown[])
        .map((o) => String(o).trim().slice(0, 120))
        .filter(Boolean)
    : [];
  let scaleMin: number | null = null;
  let scaleMax: number | null = null;

  if (kind === "CHOICE" || kind === "MULTI") {
    if (options.length < 2) {
      return { ok: false, error: `“${prompt}” needs at least 2 options` };
    }
    options = options.slice(0, 12);
  } else if (kind === "THIS_OR_THAT") {
    if (options.length !== 2) {
      return { ok: false, error: `“${prompt}” needs exactly 2 options` };
    }
  } else if (kind === "RATING") {
    options = [];
    scaleMax = Math.min(10, Math.max(3, Number(raw.scaleMax ?? 5) || 5));
  } else if (kind === "SCALE") {
    options = [];
    scaleMin = Math.max(0, Number(raw.scaleMin ?? 1) || 1);
    scaleMax = Math.min(20, Math.max(scaleMin + 1, Number(raw.scaleMax ?? 10) || 10));
  }

  return {
    ok: true,
    data: {
      id: createId(),
      order,
      kind,
      prompt,
      options,
      scaleMin,
      scaleMax,
      minLabel: raw.minLabel ? String(raw.minLabel).trim().slice(0, 40) || null : null,
      maxLabel: raw.maxLabel ? String(raw.maxLabel).trim().slice(0, 40) || null : null,
      allowOther:
        (kind === "CHOICE" || kind === "MULTI") && raw.allowOther === true,
    },
  };
}

/** Create a quick poll with its questions. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim().slice(0, 200);
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  const rawQuestions = Array.isArray(body.questions) ? body.questions : [];
  if (rawQuestions.length === 0 || rawQuestions.length > 20) {
    return NextResponse.json(
      { error: "Add between 1 and 20 questions" },
      { status: 400 }
    );
  }

  const questions: ParsedQuestion[] = [];
  for (let i = 0; i < rawQuestions.length; i++) {
    const parsed = parseQuestion(rawQuestions[i] as QuestionBody, i);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    questions.push(parsed.data);
  }

  const base = slugifyTitle(title);
  let slug = base;
  let n = 0;
  while (await prisma.poll.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }

  const poll = await prisma.poll.create({
    data: {
      id: createId(),
      slug,
      title,
      description: body.description
        ? String(body.description).trim().slice(0, 1000) || null
        : null,
      showResults: body.showResults !== false,
      collectNames: body.collectNames !== false,
      createdById: session.id,
      questions: { create: questions },
    },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ poll }, { status: 201 });
}
