/** Shared validation + tallying for quick question polls. */

export type QuestionKind =
  | "CHOICE"
  | "MULTI"
  | "THIS_OR_THAT"
  | "RATING"
  | "SCALE";

export const KIND_LABELS: Record<QuestionKind, string> = {
  CHOICE: "Multiple choice (pick one)",
  MULTI: "Checkboxes (pick several)",
  THIS_OR_THAT: "This or that",
  RATING: "Star rating",
  SCALE: "Scale",
};

export interface QuestionShape {
  id: string;
  kind: QuestionKind;
  prompt: string;
  options: string[];
  scaleMin: number | null;
  scaleMax: number | null;
  minLabel?: string | null;
  maxLabel?: string | null;
  allowOther: boolean;
}

export interface AnswerInput {
  questionId: string;
  selections?: number[];
  value?: number | null;
  otherText?: string | null;
}

/** Validate one answer against its question. Returns an error string or null. */
export function validateAnswer(
  q: QuestionShape,
  a: AnswerInput
): string | null {
  const sels = Array.isArray(a.selections)
    ? a.selections.filter(
        (i) => Number.isInteger(i) && i >= 0 && i < q.options.length
      )
    : [];
  const other =
    typeof a.otherText === "string" && a.otherText.trim()
      ? a.otherText.trim().slice(0, 200)
      : null;

  switch (q.kind) {
    case "CHOICE": {
      const picks = sels.length + (other && q.allowOther ? 1 : 0);
      if (picks !== 1) return `Pick one answer for “${q.prompt}”`;
      return null;
    }
    case "MULTI": {
      if (sels.length === 0 && !(other && q.allowOther)) {
        return `Pick at least one answer for “${q.prompt}”`;
      }
      return null;
    }
    case "THIS_OR_THAT": {
      if (sels.length !== 1) return `Pick one for “${q.prompt}”`;
      return null;
    }
    case "RATING": {
      const max = q.scaleMax ?? 5;
      if (!Number.isInteger(a.value) || a.value! < 1 || a.value! > max) {
        return `Pick a rating for “${q.prompt}”`;
      }
      return null;
    }
    case "SCALE": {
      const min = q.scaleMin ?? 1;
      const max = q.scaleMax ?? 10;
      if (!Number.isInteger(a.value) || a.value! < min || a.value! > max) {
        return `Pick a number for “${q.prompt}”`;
      }
      return null;
    }
  }
}

/** Normalize an answer for storage (drops out-of-range junk). */
export function normalizeAnswer(q: QuestionShape, a: AnswerInput) {
  const sels = Array.isArray(a.selections)
    ? [
        ...new Set(
          a.selections.filter(
            (i) => Number.isInteger(i) && i >= 0 && i < q.options.length
          )
        ),
      ]
    : [];
  const numeric =
    q.kind === "RATING" || q.kind === "SCALE" ? (a.value ?? null) : null;
  const other =
    (q.kind === "CHOICE" || q.kind === "MULTI") &&
    q.allowOther &&
    typeof a.otherText === "string" &&
    a.otherText.trim()
      ? a.otherText.trim().slice(0, 200)
      : null;
  return {
    selections: q.kind === "CHOICE" || q.kind === "THIS_OR_THAT"
      ? sels.slice(0, 1)
      : q.kind === "MULTI"
        ? sels
        : [],
    value: numeric,
    otherText: other,
  };
}

export interface AnswerRow {
  questionId: string;
  selections: number[];
  value: number | null;
  otherText: string | null;
}

export interface QuestionTally {
  questionId: string;
  totalAnswers: number;
  /** Per-option counts (choice kinds) */
  optionCounts: number[];
  otherCount: number;
  otherTexts: string[];
  /** RATING / SCALE */
  average: number | null;
  /** Histogram keyed from scaleMin..scaleMax */
  histogram: number[];
}

export function tallyQuestion(
  q: QuestionShape,
  answers: AnswerRow[]
): QuestionTally {
  const mine = answers.filter((a) => a.questionId === q.id);
  const optionCounts = q.options.map(() => 0);
  let otherCount = 0;
  const otherTexts: string[] = [];
  let sum = 0;
  let numeric = 0;
  const min = q.kind === "RATING" ? 1 : (q.scaleMin ?? 1);
  const max = q.scaleMax ?? (q.kind === "RATING" ? 5 : 10);
  const histogram = Array.from({ length: Math.max(0, max - min + 1) }, () => 0);

  for (const a of mine) {
    for (const i of a.selections) {
      if (i >= 0 && i < optionCounts.length) optionCounts[i]++;
    }
    if (a.otherText) {
      otherCount++;
      otherTexts.push(a.otherText);
    }
    if (a.value != null && a.value >= min && a.value <= max) {
      sum += a.value;
      numeric++;
      histogram[a.value - min]++;
    }
  }

  return {
    questionId: q.id,
    totalAnswers: mine.length,
    optionCounts,
    otherCount,
    otherTexts,
    average: numeric > 0 ? Math.round((sum / numeric) * 10) / 10 : null,
    histogram,
  };
}

/** The message an organizer texts out with the poll link. */
export function pollShareMessage(title: string, url: string): string {
  return `Quick poll: ${title} — tap to answer (takes a few seconds): ${url}`;
}
