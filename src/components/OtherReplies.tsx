"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type OtherReply = {
  id: string;
  displayName: string;
  answer: string;
  count: number;
};

/**
 * Shared-link replies not on the personal roster. These still count toward
 * the big Coming/Maybe/Can't numbers until cleared.
 */
export default function OtherReplies({
  rsvpId,
  replies: initial,
}: {
  rsvpId: string;
  replies: OtherReply[];
}) {
  const router = useRouter();
  const [replies, setReplies] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (replies.length === 0) return null;

  async function removeOne(id: string) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/app/rsvps/${rsvpId}/responses`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseIds: [id] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "Could not remove reply");
        return;
      }
      setReplies((list) => list.filter((r) => r.id !== id));
      router.refresh();
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function clearAll() {
    if (
      !confirm(
        `Remove all ${replies.length} shared-link replies?\n\n` +
          "The Coming/Maybe/Can't totals will update to match only the " +
          "personal list attendance roll. This cannot be undone."
      )
    ) {
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/app/rsvps/${rsvpId}/responses`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allOrphans: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "Could not clear replies");
        return;
      }
      setReplies([]);
      router.refresh();
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-line bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">
            Other replies ({replies.length})
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            From the shared link (or old test replies no longer on your list).
            These still add to the big Coming/Maybe/Can&apos;t numbers above
            until you remove them.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void clearAll()}
          className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-muted transition hover:border-danger hover:text-danger disabled:opacity-50"
        >
          Clear all
        </button>
      </div>
      {err && (
        <p className="mt-2 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
          {err}
        </p>
      )}
      <ul className="mt-2 divide-y divide-line">
        {replies.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">
                {r.displayName}
                {r.count > 1 && (
                  <span className="ml-1.5 text-xs font-normal text-ink-subtle">
                    ×{r.count}
                  </span>
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                  r.answer === "YES"
                    ? "bg-accent-soft text-accent"
                    : r.answer === "MAYBE"
                      ? "bg-brand-soft text-brand-text"
                      : "bg-card-muted text-ink-subtle ring-1 ring-line"
                }`}
              >
                {r.answer === "YES"
                  ? "Coming"
                  : r.answer === "MAYBE"
                    ? "Maybe"
                    : "Can't"}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => void removeOne(r.id)}
                className="text-xs font-medium text-ink-subtle transition hover:text-danger disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
