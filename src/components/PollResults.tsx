import type { QuestionShape, QuestionTally } from "@/lib/polls";

/** Read-only tallies for a poll — bars for choices, averages for numerics. */
export default function PollResults({
  questions,
  tallies,
}: {
  questions: QuestionShape[];
  tallies: Map<string, QuestionTally> | Record<string, QuestionTally>;
}) {
  const get = (id: string): QuestionTally | undefined =>
    tallies instanceof Map
      ? tallies.get(id)
      : (tallies as Record<string, QuestionTally>)[id];

  return (
    <div className="space-y-5">
      {questions.map((q, qi) => {
        const t = get(q.id);
        if (!t) return null;
        const total = Math.max(1, t.totalAnswers);

        return (
          <div
            key={q.id}
            className="rounded-2xl border border-line bg-card p-4 shadow-sm"
          >
            <p className="text-sm font-semibold text-ink">
              {qi + 1}. {q.prompt}
            </p>
            <p className="mt-0.5 text-xs text-ink-subtle">
              {t.totalAnswers} answer{t.totalAnswers === 1 ? "" : "s"}
            </p>

            {(q.kind === "CHOICE" ||
              q.kind === "MULTI" ||
              q.kind === "THIS_OR_THAT") && (
              <ul className="mt-3 space-y-2">
                {q.options.map((opt, i) => {
                  const count = t.optionCounts[i] ?? 0;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <li key={i}>
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate text-ink">{opt}</span>
                        <span className="shrink-0 text-xs font-semibold text-ink-muted">
                          {count} · {pct}%
                        </span>
                      </div>
                      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-card-muted">
                        <div
                          className="h-full rounded-full bg-brand transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
                {q.allowOther && t.otherCount > 0 && (
                  <li>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="text-ink">Other</span>
                      <span className="shrink-0 text-xs font-semibold text-ink-muted">
                        {t.otherCount} ·{" "}
                        {Math.round((t.otherCount / total) * 100)}%
                      </span>
                    </div>
                    <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-card-muted">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{
                          width: `${Math.round((t.otherCount / total) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-ink-subtle">
                      {t.otherTexts.slice(0, 6).join(" · ")}
                      {t.otherTexts.length > 6
                        ? ` +${t.otherTexts.length - 6} more`
                        : ""}
                    </p>
                  </li>
                )}
              </ul>
            )}

            {(q.kind === "RATING" || q.kind === "SCALE") && (
              <div className="mt-3">
                <p className="text-2xl font-bold text-ink">
                  {t.average ?? "—"}
                  <span className="ml-1 text-sm font-normal text-ink-subtle">
                    avg of{" "}
                    {q.kind === "RATING"
                      ? `${q.scaleMax ?? 5} stars`
                      : `${q.scaleMin ?? 1}–${q.scaleMax ?? 10}`}
                  </span>
                </p>
                <div className="mt-2 flex items-end gap-1">
                  {t.histogram.map((count, i) => {
                    const peak = Math.max(1, ...t.histogram);
                    const min = q.kind === "RATING" ? 1 : (q.scaleMin ?? 1);
                    return (
                      <div
                        key={i}
                        className="flex flex-1 flex-col items-center gap-1"
                      >
                        <div
                          className="w-full rounded-t bg-brand"
                          style={{
                            height: `${Math.max(3, (count / peak) * 48)}px`,
                            opacity: count === 0 ? 0.15 : 1,
                          }}
                          title={`${count}`}
                        />
                        <span className="text-[10px] text-ink-subtle">
                          {min + i}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {(q.minLabel || q.maxLabel) && (
                  <div className="mt-1 flex justify-between text-[10px] text-ink-subtle">
                    <span>{q.minLabel}</span>
                    <span>{q.maxLabel}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
