"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { QuestionShape } from "@/lib/polls";

interface AnswerState {
  selections: number[];
  value: number | null;
  otherText: string;
  otherOn: boolean;
}

interface InitialVote {
  displayName: string | null;
  answers: Record<
    string,
    { selections: number[]; value: number | null; otherText: string | null }
  >;
}

export default function VoteClient({
  slug,
  closed,
  collectNames,
  questions,
  initial,
}: {
  slug: string;
  closed: boolean;
  collectNames: boolean;
  questions: QuestionShape[];
  initial: InitialVote | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(!initial);
  const [name, setName] = useState(initial?.displayName ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() => {
    const out: Record<string, AnswerState> = {};
    for (const q of questions) {
      const prev = initial?.answers[q.id];
      out[q.id] = {
        selections: prev?.selections ?? [],
        value: prev?.value ?? null,
        otherText: prev?.otherText ?? "",
        otherOn: Boolean(prev?.otherText),
      };
    }
    return out;
  });

  function patch(qid: string, p: Partial<AnswerState>) {
    setAnswers((a) => ({ ...a, [qid]: { ...a[qid], ...p } }));
  }

  const answered = (q: QuestionShape): boolean => {
    const a = answers[q.id];
    if (!a) return false;
    switch (q.kind) {
      case "CHOICE":
        return a.selections.length === 1 || (a.otherOn && !!a.otherText.trim());
      case "MULTI":
        return a.selections.length > 0 || (a.otherOn && !!a.otherText.trim());
      case "THIS_OR_THAT":
        return a.selections.length === 1;
      case "RATING":
      case "SCALE":
        return a.value != null;
    }
  };
  const allAnswered =
    questions.every(answered) && (!collectNames || !!name.trim());

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/p/${slug}/vote`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: collectNames ? name.trim() : undefined,
          answers: questions.map((q) => {
            const a = answers[q.id];
            return {
              questionId: q.id,
              selections: a.otherOn && q.kind === "CHOICE" ? [] : a.selections,
              value: a.value,
              otherText: a.otherOn ? a.otherText.trim() : null,
            };
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save your answers");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (closed) {
    return (
      <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand-text">
        This poll is closed — thanks to everyone who answered!
      </p>
    );
  }

  if (!editing) {
    return (
      <div className="rounded-2xl border border-accent/40 bg-accent-soft p-4">
        <p className="text-sm font-semibold text-ink">
          ✓ Your answers are in{collectNames && name ? `, ${name.trim()}` : ""}!
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          Changed your mind? You can update your answers from this device.
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-3 rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-card-muted"
        >
          Change my answers
        </button>
      </div>
    );
  }

  const optBtn = (active: boolean) =>
    `flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm font-medium transition ${
      active
        ? "border-brand bg-brand-soft text-brand-text"
        : "border-line bg-card text-ink hover:border-line-strong"
    }`;

  return (
    <div className="space-y-5">
      {collectNames && (
        <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
          <label className="block text-sm font-medium text-ink">
            Your name
          </label>
          <input
            className="mt-1 w-full rounded-xl border border-line bg-card-muted px-3 py-3 text-base text-ink placeholder:text-ink-subtle"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First & last name"
            autoComplete="name"
          />
        </div>
      )}

      {questions.map((q, qi) => {
        const a = answers[q.id];
        return (
          <div
            key={q.id}
            className="rounded-2xl border border-line bg-card p-4 shadow-sm"
          >
            <p className="text-sm font-semibold text-ink">
              {qi + 1}. {q.prompt}
            </p>

            {q.kind === "THIS_OR_THAT" ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {q.options.map((opt, i) => {
                  const active = a.selections[0] === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      aria-pressed={active}
                      onClick={() => patch(q.id, { selections: [i] })}
                      className={`min-h-20 rounded-xl border-2 px-3 py-4 text-center text-sm font-semibold transition ${
                        active
                          ? "border-brand bg-brand text-brand-contrast"
                          : "border-line bg-card-muted text-ink hover:border-brand/50"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : q.kind === "CHOICE" || q.kind === "MULTI" ? (
              <div className="mt-3 space-y-2">
                {q.kind === "MULTI" && (
                  <p className="text-xs text-ink-subtle">Pick all that apply</p>
                )}
                {q.options.map((opt, i) => {
                  const active = a.selections.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        if (q.kind === "CHOICE") {
                          patch(q.id, { selections: [i], otherOn: false });
                        } else {
                          patch(q.id, {
                            selections: active
                              ? a.selections.filter((s) => s !== i)
                              : [...a.selections, i],
                          });
                        }
                      }}
                      className={optBtn(active)}
                    >
                      <span>{opt}</span>
                      {active && (
                        <svg
                          className="h-4 w-4 shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </button>
                  );
                })}
                {q.allowOther && (
                  <>
                    <button
                      type="button"
                      aria-pressed={a.otherOn}
                      onClick={() =>
                        patch(
                          q.id,
                          q.kind === "CHOICE"
                            ? { otherOn: !a.otherOn, selections: [] }
                            : { otherOn: !a.otherOn }
                        )
                      }
                      className={optBtn(a.otherOn)}
                    >
                      <span>Other…</span>
                    </button>
                    {a.otherOn && (
                      <input
                        className="w-full rounded-xl border border-line bg-card-muted px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle"
                        placeholder="Your answer"
                        value={a.otherText}
                        onChange={(e) =>
                          patch(q.id, { otherText: e.target.value })
                        }
                      />
                    )}
                  </>
                )}
              </div>
            ) : q.kind === "RATING" ? (
              <div className="mt-3 flex gap-1">
                {Array.from({ length: q.scaleMax ?? 5 }, (_, i) => i + 1).map(
                  (star) => {
                    const filled = (a.value ?? 0) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        aria-label={`${star} star${star === 1 ? "" : "s"}`}
                        aria-pressed={a.value === star}
                        onClick={() => patch(q.id, { value: star })}
                        className="p-1"
                      >
                        <svg
                          className={`h-9 w-9 transition ${
                            filled ? "text-amber-400" : "text-line-strong"
                          }`}
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M12 2.5l2.9 6.2 6.8.8-5 4.6 1.3 6.7-6-3.3-6 3.3 1.3-6.7-5-4.6 6.8-.8z" />
                        </svg>
                      </button>
                    );
                  }
                )}
              </div>
            ) : (
              /* SCALE */
              <div className="mt-3">
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(
                    { length: (q.scaleMax ?? 10) - (q.scaleMin ?? 1) + 1 },
                    (_, i) => (q.scaleMin ?? 1) + i
                  ).map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={a.value === n}
                      onClick={() => patch(q.id, { value: n })}
                      className={`h-11 w-11 rounded-xl border text-sm font-semibold transition ${
                        a.value === n
                          ? "border-brand bg-brand text-brand-contrast"
                          : "border-line bg-card-muted text-ink hover:border-brand/50"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                {(q.minLabel || q.maxLabel) && (
                  <div className="mt-1.5 flex justify-between text-[11px] text-ink-subtle">
                    <span>{q.minLabel}</span>
                    <span>{q.maxLabel}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {error && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={busy || !allAnswered}
        onClick={() => void submit()}
        className="w-full rounded-xl bg-brand py-3.5 text-sm font-semibold text-brand-contrast transition hover:bg-brand-strong disabled:opacity-50"
      >
        {busy ? "Saving…" : initial ? "Update my answers" : "Submit answers"}
      </button>
      {!allAnswered && (
        <p className="text-center text-xs text-ink-subtle">
          Answer every question{collectNames ? " and add your name" : ""} to
          submit.
        </p>
      )}
    </div>
  );
}
