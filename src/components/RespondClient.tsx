"use client";

import { useCallback, useState } from "react";
import AvailabilityGrid, { type GridMode } from "./AvailabilityGrid";
import BestTimesPanel from "./BestTimesPanel";
import {
  formatDateRange,
  formatSlotLabel,
  formatTime12,
  timezoneLabel,
  type RankedSlot,
  type SlotAggregate,
} from "@/lib/meeting-poll";

interface Meeting {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  timezone: string;
  slotMinutes: number;
  startTime: string;
  endTime: string;
  dates: string[];
  durationHintMinutes: number | null;
  chosenSlotKey: string | null;
  meetingDurationMin: number | null;
  meetingSubject: string | null;
  meetingLocation: string | null;
}

export default function RespondClient({
  initial,
}: {
  initial: {
    meeting: Meeting;
    aggregates: SlotAggregate[];
    bestSlots: RankedSlot[];
    responseCount: number;
    myResponse: { slots: string[]; displayName: string } | null;
  };
}) {
  const m = initial.meeting;
  const [mode, setMode] = useState<GridMode>("mine");
  const [name, setName] = useState(initial.myResponse?.displayName ?? "");
  const [selected, setSelected] = useState(
    () => new Set(initial.myResponse?.slots ?? [])
  );
  const [aggregates, setAggregates] = useState(initial.aggregates);
  const [bestSlots, setBestSlots] = useState(initial.bestSlots);
  const [responseCount, setResponseCount] = useState(initial.responseCount);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const closed = m.status === "CLOSED";

  const onChange = useCallback((next: Set<string>) => {
    setSelected(next);
    setDirty(true);
    setSaved(false);
  }, []);

  async function refresh() {
    const res = await fetch(`/api/m/${m.slug}`);
    if (!res.ok) return;
    const data = await res.json();
    setAggregates(data.aggregates);
    setBestSlots(data.bestSlots);
    setResponseCount(data.responseCount);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/m/${m.slug}/response`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: name.trim(),
          slots: Array.from(selected),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Save failed");
        return;
      }
      setDirty(false);
      setSaved(true);
      await refresh();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  const tz = timezoneLabel(m.timezone);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
          Find a time
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{m.title}</h1>
        {m.description && (
          <p className="mt-2 text-sm text-slate-600">{m.description}</p>
        )}
        <p className="mt-2 text-sm text-slate-500">
          {formatDateRange(m.dates)} · {formatTime12(m.startTime)}–
          {formatTime12(m.endTime)} {tz}
          {" · "}
          <span className="font-medium text-slate-700">
            {responseCount} responded
          </span>
        </p>
      </header>

      {m.chosenSlotKey && (
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-900">Meeting set</p>
          <p className="mt-1 text-sm text-emerald-800">
            {m.meetingSubject || m.title}
            {" · "}
            {formatSlotLabel(m.chosenSlotKey)}
            {m.meetingDurationMin ? ` · ${m.meetingDurationMin} min` : ""}
            {m.meetingLocation ? ` · ${m.meetingLocation}` : ""}
          </p>
          <a
            href={`/api/m/${m.slug}/ics`}
            className="mt-3 inline-flex rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
          >
            Add to calendar (.ics)
          </a>
          <p className="mt-2 text-xs text-emerald-700">
            On iPhone or Android, open the file and tap Add to Calendar.
          </p>
        </div>
      )}

      {closed && !m.chosenSlotKey && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This poll is closed. You can still view the group heatmap.
        </p>
      )}

      <div className="mb-3 flex gap-1 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setMode("mine")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${
            mode === "mine" ? "bg-white shadow-sm" : "text-slate-600"
          }`}
        >
          My times
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("heatmap");
            void refresh();
          }}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${
            mode === "heatmap" ? "bg-white shadow-sm" : "text-slate-600"
          }`}
        >
          Group heatmap
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div>
          {mode === "mine" && !closed && (
            <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <label className="text-sm font-medium text-slate-700">
                Your name
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setDirty(true);
                  setSaved(false);
                }}
                placeholder="How others will see you"
              />
            </div>
          )}

          <AvailabilityGrid
            dates={m.dates}
            startTime={m.startTime}
            endTime={m.endTime}
            slotMinutes={m.slotMinutes}
            selected={selected}
            onChange={onChange}
            mode={mode}
            aggregates={aggregates}
            responseCount={responseCount}
            readOnly={closed || mode === "heatmap"}
          />

          {mode === "mine" && !closed && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={saving || !name.trim()}
                onClick={() => void save()}
                className="rounded-xl bg-sky-700 px-6 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : dirty ? "Save my availability" : "Saved"}
              </button>
              {saved && !dirty && (
                <span className="text-xs text-emerald-600">Saved</span>
              )}
            </div>
          )}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        <BestTimesPanel
          bestSlots={bestSlots}
          responseCount={responseCount}
          durationHintMinutes={m.durationHintMinutes}
        />
      </div>
    </div>
  );
}
