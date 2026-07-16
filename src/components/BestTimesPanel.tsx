"use client";

import { formatSlotLabel, type RankedSlot } from "@/lib/meeting-poll";

interface Props {
  bestSlots: RankedSlot[];
  responseCount: number;
  durationHintMinutes?: number | null;
  timezone?: string;
}

export default function BestTimesPanel({
  bestSlots,
  responseCount,
  durationHintMinutes,
  timezone,
}: Props) {
  return (
    <div className="rounded-xl border border-line bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-ink">Best times</h3>
      {durationHintMinutes ? (
        <p className="mt-0.5 text-xs text-ink-subtle">
          Looking for ~{durationHintMinutes} minutes
        </p>
      ) : null}

      {responseCount === 0 || bestSlots.length === 0 ? (
        <p className="mt-4 text-sm text-ink-subtle">
          No responses yet. Share the poll so people can paint their
          availability.
        </p>
      ) : (
        <ol className="mt-3 space-y-2">
          {bestSlots.map((slot) => {
            const pct =
              responseCount > 0
                ? Math.round((slot.count / responseCount) * 100)
                : 0;
            return (
              <li
                key={slot.key}
                className="flex items-start gap-3 rounded-lg border border-brand/25 bg-brand-soft px-3 py-2"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-contrast">
                  {slot.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">
                    {formatSlotLabel(slot.key, timezone)}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {slot.count} of {responseCount} free ({pct}%)
                    {slot.contiguousMinutes > 0
                      ? ` · ${slot.contiguousMinutes}m block`
                      : ""}
                  </p>
                  {slot.names.length > 0 && (
                    <p className="mt-0.5 truncate text-[11px] text-ink-subtle">
                      {slot.names.join(", ")}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-4 border-t border-line pt-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
          Heatmap scale
        </p>
        <div className="flex h-3 overflow-hidden rounded-full">
          <div className="flex-1 bg-card-muted" title="0 free" />
          <div className="flex-1 bg-blue-100" title="few" />
          <div className="flex-1 bg-blue-300" />
          <div className="flex-1 bg-blue-500" />
          <div className="flex-1 bg-blue-700" title="all free" />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-ink-subtle">
          <span>Busy</span>
          <span>All free</span>
        </div>
      </div>
    </div>
  );
}
