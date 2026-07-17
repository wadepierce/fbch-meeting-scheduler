"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KIND_LABELS, type QuestionKind } from "@/lib/polls";

interface QDraft {
  kind: QuestionKind;
  prompt: string;
  optionsText: string;
  scaleMin: number;
  scaleMax: number;
  minLabel: string;
  maxLabel: string;
  allowOther: boolean;
}

function newQuestion(kind: QuestionKind): QDraft {
  return {
    kind,
    prompt: "",
    optionsText:
      kind === "THIS_OR_THAT" ? "Option A\nOption B" : "",
    scaleMin: 1,
    scaleMax: kind === "RATING" ? 5 : 10,
    minLabel: "",
    maxLabel: "",
    allowOther: false,
  };
}

export default function PollBuilder() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [collectNames, setCollectNames] = useState(true);
  const [showResults, setShowResults] = useState(true);
  const [questions, setQuestions] = useState<QDraft[]>([newQuestion("CHOICE")]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patch(i: number, p: Partial<QDraft>) {
    setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...p } : q)));
  }

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/app/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          collectNames,
          showResults,
          questions: questions.map((q) => ({
            kind: q.kind,
            prompt: q.prompt,
            options: q.optionsText
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
            scaleMin: q.scaleMin,
            scaleMax: q.scaleMax,
            minLabel: q.minLabel || null,
            maxLabel: q.maxLabel || null,
            allowOther: q.allowOther,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create the poll");
        return;
      }
      router.push(`/app/polls/${data.poll.id}`);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "mt-1 w-full rounded-xl border border-line bg-card-muted px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle";
  const label = "block text-xs font-medium text-ink-subtle";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
        <label className={label}>Poll title</label>
        <input
          className={input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="VBS theme vote"
        />
        <label className={`${label} mt-3`}>Intro (optional)</label>
        <textarea
          className={input}
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Help us pick! Takes 30 seconds."
        />
        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={collectNames}
              onChange={(e) => setCollectNames(e.target.checked)}
              className="h-4 w-4 rounded border-line accent-brand"
            />
            Ask for names (uncheck for anonymous answers)
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={showResults}
              onChange={(e) => setShowResults(e.target.checked)}
              className="h-4 w-4 rounded border-line accent-brand"
            />
            Show results to people after they answer
          </label>
        </div>
      </div>

      {questions.map((q, i) => (
        <div
          key={i}
          className="rounded-2xl border border-line bg-card p-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">Question {i + 1}</p>
            {questions.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setQuestions((qs) => qs.filter((_, j) => j !== i))
                }
                className="text-xs font-medium text-ink-muted transition hover:text-danger"
              >
                Remove
              </button>
            )}
          </div>

          <label className={`${label} mt-3`}>Type</label>
          <select
            className={input}
            value={q.kind}
            onChange={(e) => {
              const kind = e.target.value as QuestionKind;
              patch(i, {
                kind,
                scaleMax: kind === "RATING" ? 5 : kind === "SCALE" ? 10 : q.scaleMax,
                optionsText:
                  kind === "THIS_OR_THAT" && !q.optionsText.trim()
                    ? "Option A\nOption B"
                    : q.optionsText,
              });
            }}
          >
            {(Object.keys(KIND_LABELS) as QuestionKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>

          <label className={`${label} mt-3`}>Question</label>
          <input
            className={input}
            value={q.prompt}
            onChange={(e) => patch(i, { prompt: e.target.value })}
            placeholder={
              q.kind === "RATING"
                ? "How was the retreat?"
                : q.kind === "THIS_OR_THAT"
                  ? "Pancakes or waffles for the men's breakfast?"
                  : "Which VBS theme should we pick?"
            }
          />

          {(q.kind === "CHOICE" ||
            q.kind === "MULTI" ||
            q.kind === "THIS_OR_THAT") && (
            <>
              <label className={`${label} mt-3`}>
                {q.kind === "THIS_OR_THAT"
                  ? "The two options (one per line)"
                  : "Options (one per line)"}
              </label>
              <textarea
                className={`${input} font-mono text-xs`}
                rows={q.kind === "THIS_OR_THAT" ? 2 : 4}
                value={q.optionsText}
                onChange={(e) => patch(i, { optionsText: e.target.value })}
              />
              {q.kind !== "THIS_OR_THAT" && (
                <label className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
                  <input
                    type="checkbox"
                    checked={q.allowOther}
                    onChange={(e) => patch(i, { allowOther: e.target.checked })}
                    className="h-4 w-4 rounded border-line accent-brand"
                  />
                  Allow a write-in “Other” answer
                </label>
              )}
            </>
          )}

          {q.kind === "RATING" && (
            <>
              <label className={`${label} mt-3`}>Stars</label>
              <select
                className={input}
                value={q.scaleMax}
                onChange={(e) => patch(i, { scaleMax: Number(e.target.value) })}
              >
                {[3, 4, 5, 7, 10].map((n) => (
                  <option key={n} value={n}>
                    {n} stars
                  </option>
                ))}
              </select>
            </>
          )}

          {q.kind === "SCALE" && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <label className={label}>From</label>
                <input
                  type="number"
                  className={input}
                  value={q.scaleMin}
                  min={0}
                  max={19}
                  onChange={(e) =>
                    patch(i, { scaleMin: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className={label}>To</label>
                <input
                  type="number"
                  className={input}
                  value={q.scaleMax}
                  min={1}
                  max={20}
                  onChange={(e) =>
                    patch(i, { scaleMax: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className={label}>Low label (optional)</label>
                <input
                  className={input}
                  value={q.minLabel}
                  onChange={(e) => patch(i, { minLabel: e.target.value })}
                  placeholder="Not interested"
                />
              </div>
              <div>
                <label className={label}>High label (optional)</label>
                <input
                  className={input}
                  value={q.maxLabel}
                  onChange={(e) => patch(i, { maxLabel: e.target.value })}
                  placeholder="Can't wait"
                />
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() => setQuestions((qs) => [...qs, newQuestion("CHOICE")])}
        className="w-full rounded-xl border border-dashed border-line py-3 text-sm font-medium text-brand-text transition hover:bg-brand-soft"
      >
        + Add another question
      </button>

      {error && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={busy || !title.trim() || questions.some((q) => !q.prompt.trim())}
        onClick={() => void create()}
        className="w-full rounded-xl bg-brand py-3.5 text-sm font-semibold text-brand-contrast transition hover:bg-brand-strong disabled:opacity-50"
      >
        {busy ? "Creating…" : "Create poll & get share link"}
      </button>
    </div>
  );
}
