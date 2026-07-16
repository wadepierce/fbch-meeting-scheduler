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
  selectedRef.current = selected;

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
    const isRight =
      "button" in e && (e.button === 2 || e.shiftKey);
    const currently = selectedRef.current.has(key);
    paintValue.current = isRight ? false : !currently;
    // If shift or right-click → erase; if empty → paint; if filled → erase on click
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

  return (
    <div className="relative">
      <div
        className="overflow-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-gray-900"
        onContextMenu={(e) => e.preventDefault()}
      >
        <table className="border-collapse text-xs select-none">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 min-w-[4.5rem] bg-gray-50 px-2 py-2 text-left font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                Time
              </th>
              {dates.map((date) => {
                const h = dateHeader(date);
                return (
                  <th
                    key={date}
                    className="sticky top-0 z-20 min-w-[3.25rem] bg-gray-50 px-1 py-2 text-center font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  >
                    <div className="text-[10px] uppercase tracking-wide text-gray-400">
                      {h.weekday}
                    </div>
                    <div className="text-sm font-semibold">{h.day}</div>
                    <div className="text-[10px] text-gray-400">{h.month}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {times.map((time) => (
              <tr key={time}>
                <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-2 py-0.5 text-right font-mono text-[11px] tabular-nums text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                  {formatTime12(time)}
                </td>
                {dates.map((date) => {
                  const key = `${date}T${time}`;
                  const isFree = selected.has(key);
                  const agg = aggMap.get(key);
                  const count = agg?.count ?? 0;

                  let cellStyle: React.CSSProperties = {};
                  let cellClass =
                    "h-7 w-[3.25rem] border border-gray-100 transition-colors duration-100 dark:border-white/5 ";

                  if (mode === "mine") {
                    cellClass += isFree
                      ? "bg-emerald-500 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.4)] min-h-11 "
                      : "bg-gray-50 hover:bg-emerald-50 dark:bg-white/5 dark:hover:bg-emerald-950/40 min-h-11 ";
                    if (!readOnly) cellClass += "cursor-pointer ";
                  } else {
                    const bg = heatmapColor(count, responseCount);
                    cellStyle.backgroundColor =
                      count === 0 ? undefined : bg;
                    cellClass +=
                      count === 0
                        ? "bg-gray-50 dark:bg-white/5 "
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
        <div className="pointer-events-none absolute bottom-3 left-3 z-40 max-w-xs rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg dark:bg-black">
          <p className="font-semibold">
            {hoverInfo.count} of {responseCount} free
          </p>
          <p className="mt-0.5 text-gray-300">
            {hoverInfo.names.slice(0, 8).join(", ")}
            {hoverInfo.names.length > 8
              ? ` +${hoverInfo.names.length - 8} more`
              : ""}
          </p>
        </div>
      )}

      {mode === "mine" && !readOnly && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Click and drag to paint free times. Click a filled cell or hold Shift
          while dragging to erase.
        </p>
      )}
    </div>
  );
}
