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
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-text">
          Find a time
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink">{m.title}</h1>
        {m.description && (
          <p className="mt-2 text-sm text-ink-muted">{m.description}</p>
        )}
        <p className="mt-2 text-sm text-ink-subtle">
          {formatDateRange(m.dates)} · {formatTime12(m.startTime)}–
          {formatTime12(m.endTime)} {tz}
          {" · "}
          <span className="font-medium text-ink">
            {responseCount} responded
          </span>
        </p>
      </header>

      {m.chosenSlotKey && (
        <div className="mb-5 rounded-2xl border border-accent/40 bg-accent-soft p-4">
          <p className="text-sm font-semibold text-ink">Meeting set</p>
          <p className="mt-1 text-sm text-ink-muted">
            {m.meetingSubject || m.title}
            {" · "}
            {formatSlotLabel(m.chosenSlotKey)}
            {m.meetingDurationMin ? ` · ${m.meetingDurationMin} min` : ""}
            {m.meetingLocation ? ` · ${m.meetingLocation}` : ""}
          </p>
          <a
            href={`/api/m/${m.slug}/ics`}
            className="mt-3 inline-flex rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-contrast transition hover:bg-accent-strong"
          >
            Add to calendar (.ics)
          </a>
          <p className="mt-2 text-xs text-ink-subtle">
            On iPhone or Android, open the file and tap Add to Calendar.
          </p>
        </div>
      )}

      {closed && !m.chosenSlotKey && (
        <p className="mb-4 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-text">
          This poll is closed. You can still view the group heatmap.
        </p>
      )}

      <div className="mb-3 flex gap-1 rounded-xl bg-card-muted p-1">
        <button
          type="button"
          onClick={() => setMode("mine")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
            mode === "mine"
              ? "bg-card text-ink shadow-sm"
              : "text-ink-muted hover:text-ink"
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
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
            mode === "heatmap"
              ? "bg-card text-ink shadow-sm"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          Group heatmap
        </button>
      </div>

      {/* min-w-0 stops wide children (grid table / day chips) from expanding
          the grid tracks past the viewport, which makes phones zoom out */}
      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div className="min-w-0">
          {mode === "mine" && !closed && (
            <div className="mb-4 rounded-2xl border border-line bg-card p-4 shadow-sm">
              <label className="text-sm font-medium text-ink">Your name</label>
              <input
                className="mt-1 w-full rounded-xl border border-line bg-card-muted px-3 py-3 text-base text-ink placeholder:text-ink-subtle"
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
                className="rounded-xl bg-brand px-6 py-3.5 text-sm font-semibold text-brand-contrast transition hover:bg-brand-strong disabled:opacity-50"
              >
                {saving ? "Saving…" : dirty ? "Save my availability" : "Saved"}
              </button>
              {saved && !dirty && (
                <span className="text-xs text-accent">Saved</span>
              )}
            </div>
          )}
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
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
