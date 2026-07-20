"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatViews } from "@/lib/format";
import type { RsvpTally } from "@/lib/rsvp";

/**
 * Big Coming / Maybe / Can't numbers for a headcount.
 * When shared-link / detached replies inflate the totals past the attendance
 * roll, offer one-tap clear so the board matches the personal list again.
 */
export default function HeadcountTotals({
  rsvpId,
  tally,
  viewCount,
  orphanCount,
  rosterComing,
}: {
  rsvpId: string;
  tally: RsvpTally;
  viewCount: number;
  orphanCount: number;
  /** Party size from personal-list YES only */
  rosterComing: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function matchRoll() {
    if (
      !confirm(
        `Clear ${orphanCount} shared-link / test replies so the headcount matches the attendance roll?\n\n` +
          "Personal-list replies are kept. This cannot be undone."
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
        setErr(data.error || "Could not refresh totals");
        return;
      }
      router.refresh();
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-accent/40 bg-accent-soft p-4 text-center">
          <p className="text-3xl font-bold text-accent">{tally.yes}</p>
          <p className="mt-1 text-xs font-medium text-ink-muted">coming</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4 text-center">
          <p className="text-3xl font-bold text-ink">{tally.maybe}</p>
          <p className="mt-1 text-xs font-medium text-ink-muted">maybe</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4 text-center">
          <p className="text-3xl font-bold text-ink-subtle">{tally.no}</p>
          <p className="mt-1 text-xs font-medium text-ink-muted">can&apos;t</p>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-ink-subtle">
        Plan for <span className="font-semibold text-ink">{tally.yes}</span>
        {tally.maybe > 0
          ? ` (up to ${tally.yes + tally.maybe} with maybes)`
          : ""}{" "}
        · {tally.replies} repl{tally.replies === 1 ? "y" : "ies"} ·{" "}
        {formatViews(viewCount)}
      </p>

      {orphanCount > 0 && (
        <div className="mt-3 rounded-xl border border-brand/30 bg-brand-soft px-3 py-2.5 text-xs text-brand-text">
          <p>
            <span className="font-semibold">{orphanCount}</span> shared-link
            {orphanCount === 1 ? " reply" : " replies"} still count in the
            totals above
            {rosterComing === 0 && tally.yes > 0
              ? " (attendance roll shows 0 coming — likely old tests)"
              : ""}
            . Clear them to match the personal list roll.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void matchRoll()}
            className="mt-2 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-contrast transition hover:bg-brand-strong disabled:opacity-50"
          >
            {busy ? "Refreshing…" : "Match attendance roll"}
          </button>
          {err && <p className="mt-1.5 text-danger">{err}</p>}
        </div>
      )}
    </div>
  );
}
