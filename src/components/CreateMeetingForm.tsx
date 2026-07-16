"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DateMultiSelect from "./DateMultiSelect";

const TIME_OPTIONS: string[] = [];
for (let h = 6; h < 22; h++) {
  for (const m of [0, 30]) {
    TIME_OPTIONS.push(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    );
  }
}

function fmt(hhmm: string) {
  const [hS, mS] = hhmm.split(":");
  const h = parseInt(hS, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${mS} ${ampm}`;
}

export default function CreateMeetingForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [timezone] = useState("America/Chicago");
  const [durationHint, setDurationHint] = useState<number | "">(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(publish: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/app/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          dates,
          startTime,
          endTime,
          slotMinutes,
          timezone,
          durationHintMinutes: durationHint === "" ? null : durationHint,
          publish,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      router.push(`/app/${data.meeting.id}`);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <label className="text-xs font-medium text-slate-500">
          Meeting name
        </label>
        <input
          className={input}
          placeholder="Deacons meeting"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label className="mt-4 block text-xs font-medium text-slate-500">
          Notes (optional)
        </label>
        <textarea
          className={input}
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-800">
          Which days might work?
        </h2>
        <DateMultiSelect selected={dates} onChange={setDates} />
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-800">
          What times?
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500">No earlier than</label>
            <select
              className={input}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {fmt(t)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">No later than</label>
            <select
              className={input}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {fmt(t)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[15, 30, 60].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSlotMinutes(n)}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                slotMinutes === n
                  ? "bg-sky-700 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {n} min slots
            </button>
          ))}
        </div>
        <label className="mt-4 block text-xs text-slate-500">
          Looking for a meeting about…
        </label>
        <select
          className={input}
          value={durationHint === "" ? "" : String(durationHint)}
          onChange={(e) =>
            setDurationHint(e.target.value === "" ? "" : Number(e.target.value))
          }
        >
          <option value="">Any length</option>
          <option value="30">30 minutes</option>
          <option value="60">1 hour</option>
          <option value="90">90 minutes</option>
          <option value="120">2 hours</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-2 pb-8">
        <button
          type="button"
          disabled={busy || !title.trim() || dates.length === 0}
          onClick={() => void submit(true)}
          className="rounded-xl bg-sky-700 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create & get share link"}
        </button>
        <button
          type="button"
          disabled={busy || !title.trim() || dates.length === 0}
          onClick={() => void submit(false)}
          className="rounded-xl border border-slate-300 py-3 text-sm font-medium text-slate-700 disabled:opacity-50"
        >
          Save as draft
        </button>
      </div>
    </div>
  );
}
