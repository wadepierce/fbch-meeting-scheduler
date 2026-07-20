"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Answer = "YES" | "MAYBE" | "NO";

export default function RsvpClient({
  slug,
  closed,
  initial,
  /** When set, answers go through the personal invite endpoint. */
  inviteToken = null,
  /** Lock the name field (used for personal links from the roster). */
  nameLocked = false,
}: {
  slug: string;
  closed: boolean;
  initial: {
    displayName: string;
    answer: Answer | null;
    count: number;
  } | null;
  inviteToken?: string | null;
  nameLocked?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.displayName ?? "");
  const [answer, setAnswer] = useState<Answer | null>(initial?.answer ?? null);
  const [count, setCount] = useState(initial?.count ?? 1);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(Boolean(initial?.answer));
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim() || !answer) return;
    setBusy(true);
    setError(null);
    try {
      const url = inviteToken
        ? `/api/r/${slug}/t/${inviteToken}/response`
        : `/api/r/${slug}/response`;
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: name.trim(),
          answer,
          count: answer === "YES" || answer === "MAYBE" ? count : 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save");
        return;
      }
      setSaved(true);
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
        This headcount is closed. Contact the organizer if your plans changed.
      </p>
    );
  }

  const choices: { key: Answer; label: string; sub: string }[] = [
    { key: "YES", label: "I'll be there", sub: "Count me in" },
    { key: "MAYBE", label: "Maybe", sub: "Not sure yet" },
    { key: "NO", label: "Can't make it", sub: "Sorry!" },
  ];

  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      {saved ? (
        <div>
          <div className="flex items-center gap-2 text-accent">
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <h2 className="text-lg font-semibold text-ink">
              Thanks, {name.trim()}!
            </h2>
          </div>
          <p className="mt-2 text-sm text-ink-muted">
            Your answer is saved
            {answer === "YES" && count > 1 ? ` for ${count} people` : ""}. Plans
            change? Come back to this link and update it.
          </p>
          <button
            type="button"
            onClick={() => setSaved(false)}
            className="mt-4 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-card-muted"
          >
            Change my answer
          </button>
        </div>
      ) : (
        <>
          <label className="block text-sm font-medium text-ink">
            Your name
          </label>
          {nameLocked ? (
            <p className="mt-1 rounded-xl border border-line bg-card-muted px-3 py-3 text-base font-medium text-ink">
              {name}
            </p>
          ) : (
            <input
              className="mt-1 w-full rounded-xl border border-line bg-card-muted px-3 py-3 text-base text-ink placeholder:text-ink-subtle"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First & last name"
              autoComplete="name"
            />
          )}

          <p className="mt-4 text-sm font-medium text-ink">Can you make it?</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {choices.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setAnswer(c.key)}
                aria-pressed={answer === c.key}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  answer === c.key
                    ? c.key === "NO"
                      ? "border-danger bg-danger-soft"
                      : "border-accent bg-accent-soft"
                    : "border-line bg-card-muted hover:border-line-strong"
                }`}
              >
                <span className="block text-sm font-semibold text-ink">
                  {c.label}
                </span>
                <span className="block text-xs text-ink-subtle">{c.sub}</span>
              </button>
            ))}
          </div>

          {(answer === "YES" || answer === "MAYBE") && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-ink">
                How many people total (including you)?
              </label>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCount((c) => Math.max(1, c - 1))}
                  aria-label="Fewer people"
                  className="h-11 w-11 rounded-xl border border-line text-lg font-bold text-ink transition hover:bg-card-muted"
                >
                  −
                </button>
                <span className="w-10 text-center text-xl font-bold text-ink">
                  {count}
                </span>
                <button
                  type="button"
                  onClick={() => setCount((c) => Math.min(25, c + 1))}
                  aria-label="More people"
                  className="h-11 w-11 rounded-xl border border-line text-lg font-bold text-ink transition hover:bg-card-muted"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={busy || !name.trim() || !answer}
            onClick={() => void save()}
            className="mt-5 w-full rounded-xl bg-brand py-3.5 text-sm font-semibold text-brand-contrast transition hover:bg-brand-strong disabled:opacity-50"
          >
            {busy
              ? "Saving…"
              : initial?.answer
                ? "Update my answer"
                : "Send my answer"}
          </button>
        </>
      )}
    </div>
  );
}
