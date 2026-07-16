"use client";

import { useMemo, useState } from "react";
import { buildMonthGrid } from "@/lib/meeting-poll";

interface Props {
  selected: string[];
  onChange: (dates: string[]) => void;
}

export default function DateMultiSelect({ selected, onChange }: Props) {
  const today = new Date();
  const [cursor, setCursor] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [dragging, setDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"add" | "remove">("add");

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const cells = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month),
    [cursor.year, cursor.month]
  );

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" }
  );

  function toggle(date: string, mode?: "add" | "remove") {
    const set = new Set(selected);
    const m = mode ?? (set.has(date) ? "remove" : "add");
    if (m === "add") set.add(date);
    else set.delete(date);
    onChange([...set].sort());
  }

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-gray-900"
      onMouseLeave={() => setDragging(false)}
      onMouseUp={() => setDragging(false)}
    >
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="rounded-lg px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
        >
          ←
        </button>
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="rounded-lg px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-gray-400">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} className="h-9" />;
          const isSelected = selectedSet.has(date);
          const isToday =
            date ===
            `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
          const day = Number(date.slice(8));

          return (
            <button
              key={date}
              type="button"
              onMouseDown={() => {
                const mode = isSelected ? "remove" : "add";
                setDragMode(mode);
                setDragging(true);
                toggle(date, mode);
              }}
              onMouseEnter={() => {
                if (dragging) toggle(date, dragMode);
              }}
              className={`h-9 rounded-lg text-sm font-medium transition-colors ${
                isSelected
                  ? "bg-emerald-500 text-white shadow-sm"
                  : isToday
                    ? "bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/30"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Click or drag to select dates.{" "}
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {selected.length} selected
        </span>
      </p>
    </div>
  );
}
