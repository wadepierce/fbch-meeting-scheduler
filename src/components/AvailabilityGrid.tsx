"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  formatTime12,
  heatmapColor,
  heatmapTextClass,
  parseMinutes,
} from "@/lib/meeting-poll";

export type GridMode = "mine" | "heatmap";

interface AggregateCell {
  key: string;
  count: number;
  names: string[];
}

interface Props {
  dates: string[]; // ISO YYYY-MM-DD sorted
  startTime: string;
  endTime: string;
  slotMinutes: number;
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  mode: GridMode;
  aggregates: AggregateCell[];
  responseCount: number;
  readOnly?: boolean;
  timezone?: string;
}

function dateHeader(iso: string): { weekday: string; day: string; month: string } {
  const d = new Date(iso + "T12:00:00");
  return {
    weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
    day: String(d.getDate()),
    month: d.toLocaleDateString("en-US", { month: "short" }),
  };
}

export default function AvailabilityGrid({
  dates,
  startTime,
  endTime,
  slotMinutes,
  selected,
  onChange,
  mode,
  aggregates,
  responseCount,
  readOnly = false,
}: Props) {
  const times = useMemo(() => {
    const start = parseMinutes(startTime);
    const end = parseMinutes(endTime);
    const out: string[] = [];
    for (let t = start; t < end; t += slotMinutes) {
      const h = Math.floor(t / 60);
      const m = t % 60;
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
    return out;
  }, [startTime, endTime, slotMinutes]);

  const aggMap = useMemo(() => {
    const m = new Map<string, AggregateCell>();
    for (const a of aggregates) m.set(a.key, a);
    return m;
  }, [aggregates]);

  const painting = useRef(false);
  const paintValue = useRef(true); // true = add free, false = erase
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // Phones get a day-at-a-time picker instead of the full grid.
  const [activeDateState, setActiveDate] = useState(dates[0] ?? "");
  const activeDate = dates.includes(activeDateState)
    ? activeDateState
    : (dates[0] ?? "");

  /** Painted-slot count per day (badges on the mobile day chips). */
  const perDayCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const key of selected) {
      const date = key.slice(0, 10);
      m.set(date, (m.get(date) ?? 0) + 1);
    }
    return m;
  }, [selected]);

  const applyCell = useCallback(
    (key: string, value: boolean) => {
      const next = new Set(selectedRef.current);
      if (value) next.add(key);
      else next.delete(key);
      selectedRef.current = next;
      onChange(next);
    },
    [onChange]
  );

  useEffect(() => {
    function endPaint() {
      painting.current = false;
    }
    window.addEventListener("mouseup", endPaint);
    window.addEventListener("touchend", endPaint);
    return () => {
      window.removeEventListener("mouseup", endPaint);
      window.removeEventListener("touchend", endPaint);
    };
  }, []);

  function onCellPointerDown(
    e: React.MouseEvent | React.TouchEvent,
    key: string
  ) {
    if (readOnly || mode !== "mine") return;
    e.preventDefault();
    const isRight = "button" in e && (e.button === 2 || e.shiftKey);
    const currently = selectedRef.current.has(key);
    if (isRight) paintValue.current = false;
    else paintValue.current = !currently;

    painting.current = true;
    applyCell(key, paintValue.current);
  }

  function onCellEnter(key: string) {
    setHoverKey(key);
    if (!painting.current || readOnly || mode !== "mine") return;
    applyCell(key, paintValue.current);
  }

  const hoverInfo = hoverKey ? aggMap.get(hoverKey) : null;

  // ---------------------------------------------------------------- mobile
  const mobile = (
    <div className="sm:hidden">
      {/* Day selector — pt/px headroom keeps the count badge inside the
          scroll container so it never adds a vertical scroll/layout shift */}
      <div className="-mx-1 -mt-1.5 flex gap-1.5 overflow-x-auto px-1 pb-2 pt-1.5">
        {dates.map((date) => {
          const h = dateHeader(date);
          const isActive = date === activeDate;
          const count = perDayCount.get(date) ?? 0;
          return (
            <button
              key={date}
              type="button"
              onClick={() => setActiveDate(date)}
              aria-current={isActive ? "date" : undefined}
              className={`relative flex min-w-[3.5rem] shrink-0 flex-col items-center rounded-xl border px-2 py-2 transition ${
                isActive
                  ? "border-brand bg-brand text-brand-contrast"
                  : "border-line bg-card text-ink"
              }`}
            >
              <span
                className={`text-[10px] font-medium uppercase tracking-wide ${
                  isActive ? "opacity-80" : "text-ink-subtle"
                }`}
              >
                {h.weekday}
              </span>
              <span className="text-base font-bold leading-tight">{h.day}</span>
              <span
                className={`text-[10px] ${isActive ? "opacity-80" : "text-ink-subtle"}`}
              >
                {h.month}
              </span>
              {mode === "mine" && count > 0 && (
                <span
                  className={`absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                    isActive
                      ? "bg-accent text-accent-contrast"
                      : "bg-accent text-accent-contrast"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Slots for the active day */}
      {mode === "mine" ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            {times.map((time) => {
              const key = `${activeDate}T${time}`;
              const isFree = selected.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  disabled={readOnly}
                  aria-pressed={isFree}
                  aria-label={`${activeDate} ${formatTime12(time)}${
                    isFree ? ", available" : ", not available"
                  }`}
                  onClick={() => applyCell(key, !isFree)}
                  className={`flex min-h-12 items-center justify-between rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    isFree
                      ? "border-accent bg-accent text-accent-contrast"
                      : "border-line bg-card text-ink"
                  } disabled:opacity-60`}
                >
                  <span>{formatTime12(time)}</span>
                  {isFree ? (
                    <svg
                      className="h-4 w-4"
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
                  ) : (
                    <span className="text-xs text-ink-subtle">Free?</span>
                  )}
                </button>
              );
            })}
          </div>
          {!readOnly && (
            <p className="mt-2 text-xs text-ink-subtle">
              Tap the times you&apos;re free, then check the other days above.
            </p>
          )}
        </>
      ) : (
        <ul className="space-y-1.5">
          {times.map((time) => {
            const key = `${activeDate}T${time}`;
            const agg = aggMap.get(key);
            const count = agg?.count ?? 0;
            const style: React.CSSProperties =
              count > 0
                ? { backgroundColor: heatmapColor(count, responseCount) }
                : {};
            return (
              <li
                key={key}
                style={style}
                className={`rounded-xl border border-line/60 px-3 py-2.5 ${
                  count === 0
                    ? "bg-card-muted"
                    : heatmapTextClass(count, responseCount)
                }`}
              >
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>{formatTime12(time)}</span>
                  <span className="text-xs font-semibold">
                    {count} of {responseCount} free
                  </span>
                </div>
                {count > 0 && agg && (
                  <p className="mt-0.5 truncate text-[11px] opacity-80">
                    {agg.names.slice(0, 5).join(", ")}
                    {agg.names.length > 5
                      ? ` +${agg.names.length - 5} more`
                      : ""}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  // --------------------------------------------------------------- desktop
  const desktop = (
    <div className="relative hidden sm:block">
      <div
        className="overflow-auto rounded-xl border border-line bg-card shadow-sm"
        onContextMenu={(e) => e.preventDefault()}
      >
        <table className="border-collapse text-xs select-none">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 min-w-[4.5rem] bg-card-muted px-2 py-2 text-left font-medium text-ink-subtle">
                Time
              </th>
              {dates.map((date) => {
                const h = dateHeader(date);
                return (
                  <th
                    key={date}
                    className="sticky top-0 z-20 min-w-[3.25rem] bg-card-muted px-1 py-2 text-center font-medium text-ink"
                  >
                    <div className="text-[10px] uppercase tracking-wide text-ink-subtle">
                      {h.weekday}
                    </div>
                    <div className="text-sm font-semibold">{h.day}</div>
                    <div className="text-[10px] text-ink-subtle">{h.month}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {times.map((time) => (
              <tr key={time}>
                <td className="sticky left-0 z-10 whitespace-nowrap bg-card px-2 py-0.5 text-right font-mono text-[11px] tabular-nums text-ink-subtle">
                  {formatTime12(time)}
                </td>
                {dates.map((date) => {
                  const key = `${date}T${time}`;
                  const isFree = selected.has(key);
                  const agg = aggMap.get(key);
                  const count = agg?.count ?? 0;

                  const cellStyle: React.CSSProperties = {};
                  let cellClass =
                    "h-7 w-[3.25rem] border border-line/60 transition-colors duration-100 ";

                  if (mode === "mine") {
                    cellClass += isFree
                      ? "bg-accent shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)] min-h-11 "
                      : "bg-card-muted hover:bg-accent-soft min-h-11 ";
                    if (!readOnly) cellClass += "cursor-pointer ";
                  } else {
                    const bg = heatmapColor(count, responseCount);
                    cellStyle.backgroundColor = count === 0 ? undefined : bg;
                    cellClass +=
                      count === 0
                        ? "bg-card-muted "
                        : `${heatmapTextClass(count, responseCount)} `;
                  }

                  return (
                    <td key={key} className="p-0">
                      <button
                        type="button"
                        aria-label={`${date} ${formatTime12(time)}${
                          mode === "mine"
                            ? isFree
                              ? ", available"
                              : ", not available"
                            : `, ${count} free`
                        }`}
                        aria-pressed={mode === "mine" ? isFree : undefined}
                        disabled={readOnly || mode !== "mine"}
                        className={cellClass}
                        style={cellStyle}
                        onMouseDown={(e) => onCellPointerDown(e, key)}
                        onMouseEnter={() => onCellEnter(key)}
                        onTouchStart={(e) => onCellPointerDown(e, key)}
                      >
                        {mode === "heatmap" && count > 0 ? (
                          <span className="text-[10px] font-semibold">
                            {count}
                          </span>
                        ) : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Hover tooltip for heatmap */}
      {mode === "heatmap" && hoverKey && hoverInfo && hoverInfo.count > 0 && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-40 max-w-xs rounded-lg bg-ink px-3 py-2 text-xs text-canvas shadow-lg">
          <p className="font-semibold">
            {hoverInfo.count} of {responseCount} free
          </p>
          <p className="mt-0.5 opacity-80">
            {hoverInfo.names.slice(0, 8).join(", ")}
            {hoverInfo.names.length > 8
              ? ` +${hoverInfo.names.length - 8} more`
              : ""}
          </p>
        </div>
      )}

      {mode === "mine" && !readOnly && (
        <p className="mt-2 text-xs text-ink-subtle">
          Click and drag to paint free times. Click a filled cell or hold Shift
          while dragging to erase.
        </p>
      )}
    </div>
  );

  return (
    <div>
      {mobile}
      {desktop}
    </div>
  );
}
