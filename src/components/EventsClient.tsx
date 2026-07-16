"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PcoEvent {
  instanceId: string;
  eventId: string;
  name: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  location: string | null;
  approvalStatus: string | null;
  churchCenterUrl: string | null;
  recurrenceDescription: string | null;
}

interface RsvpRow {
  id: string;
  slug: string;
  title: string;
  location: string | null;
  startsAt: string;
  status: string;
  pcoInstanceId: string | null;
  replies: number;
  yes: number;
  maybe: number;
  no: number;
}

const TZ = "America/Chicago";

/** Build an ISO string that pins a wall-clock date+time to Chicago time
 * (handles CDT vs CST automatically). */
function chicagoIso(date: string, time: string): string {
  const probe = new Date(`${date}T${time}:00Z`);
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    timeZoneName: "longOffset",
  })
    .formatToParts(probe)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = part?.match(/GMT([+-]\d{2}:\d{2})/);
  return `${date}T${time}:00${m ? m[1] : "-06:00"}`;
}

function fmtWhen(iso: string, allDay = false): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: TZ,
  });
  if (allDay) return date;
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TZ,
  });
  return `${date} · ${time}`;
}

export default function EventsClient({
  pcoConfigured,
}: {
  pcoConfigured: boolean;
}) {
  const router = useRouter();

  // filters
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("date-asc");

  const [events, setEvents] = useState<PcoEvent[] | null>(null);
  const [pcoError, setPcoError] = useState<string | null>(null);
  const [rsvps, setRsvps] = useState<RsvpRow[] | null>(null);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  // manual form
  const [showManual, setShowManual] = useState(false);
  const [mTitle, setMTitle] = useState("");
  const [mDate, setMDate] = useState("");
  const [mTime, setMTime] = useState("10:30");
  const [mLocation, setMLocation] = useState("");
  const [mBusy, setMBusy] = useState(false);
  const [mError, setMError] = useState<string | null>(null);

  const loadRsvps = useCallback(async () => {
    try {
      const res = await fetch("/api/app/rsvps");
      const data = await res.json();
      setRsvps(res.ok ? (data.rsvps ?? []) : []);
    } catch {
      setRsvps([]);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    if (!pcoConfigured) {
      setEvents([]);
      return;
    }
    setPcoError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      params.set("sort", sort);
      const res = await fetch(`/api/app/pco/events?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setPcoError(data.error || "Could not reach Planning Center");
        setEvents([]);
        return;
      }
      setEvents(data.events ?? []);
    } catch {
      setPcoError("Network error while loading events");
      setEvents([]);
    }
  }, [pcoConfigured, q, from, to, sort]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRsvps();
  }, [loadRsvps]);

  // debounce event reloads as filters change
  useEffect(() => {
    const t = setTimeout(() => void loadEvents(), 250);
    return () => clearTimeout(t);
  }, [loadEvents]);

  const rsvpByInstance = new Map(
    (rsvps ?? []).filter((r) => r.pcoInstanceId).map((r) => [r.pcoInstanceId, r])
  );

  async function headcountFor(ev: PcoEvent) {
    const existing = rsvpByInstance.get(ev.instanceId);
    if (existing) {
      router.push(`/app/rsvp/${existing.id}`);
      return;
    }
    setCreatingId(ev.instanceId);
    try {
      const res = await fetch("/api/app/rsvps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: ev.name,
          description: ev.description,
          location: ev.location,
          startsAt: ev.startsAt,
          endsAt: ev.endsAt,
          timezone: TZ,
          pcoEventId: ev.eventId,
          pcoInstanceId: ev.instanceId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.rsvp?.id) {
        router.push(`/app/rsvp/${data.rsvp.id}`);
      }
    } finally {
      setCreatingId(null);
    }
  }

  async function createManual(e: React.FormEvent) {
    e.preventDefault();
    setMBusy(true);
    setMError(null);
    try {
      const res = await fetch("/api/app/rsvps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: mTitle,
          location: mLocation || null,
          startsAt: chicagoIso(mDate, mTime),
          timezone: TZ,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMError(data.error || "Could not create headcount");
        return;
      }
      router.push(`/app/rsvp/${data.rsvp.id}`);
    } finally {
      setMBusy(false);
    }
  }

  const input =
    "w-full rounded-xl border border-line bg-card-muted px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle";

  return (
    <div className="space-y-6">
      {/* Existing headcounts */}
      {rsvps && rsvps.length > 0 && (
        <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Your headcounts</h2>
          <ul className="mt-2 divide-y divide-line">
            {rsvps.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/app/rsvp/${r.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 transition hover:opacity-80"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {r.title}
                    </p>
                    <p className="text-xs text-ink-subtle">
                      {fmtWhen(r.startsAt)}
                      {r.location ? ` · ${r.location}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent">
                    {r.yes} coming
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* PCO setup / list */}
      {!pcoConfigured ? (
        <div className="rounded-2xl border border-brand/30 bg-brand-soft p-5">
          <h2 className="text-sm font-semibold text-ink">
            Connect Planning Center
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Add a free Personal Access Token so events from the church calendar
            show up here automatically:
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-muted">
            <li>
              Visit{" "}
              <span className="font-mono text-xs">
                api.planningcenteronline.com/oauth/applications
              </span>
            </li>
            <li>Create a Personal Access Token</li>
            <li>
              Set <span className="font-mono text-xs">PCO_APP_ID</span> and{" "}
              <span className="font-mono text-xs">PCO_SECRET</span> in Railway
            </li>
          </ol>
          <p className="mt-2 text-xs text-ink-subtle">
            You can still create headcounts manually below.
          </p>
        </div>
      ) : (
        <div>
          {/* Filters */}
          <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className={input}
                placeholder="Search events…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <select
                className={`${input} sm:w-44`}
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sort"
              >
                <option value="date-asc">Soonest first</option>
                <option value="date-desc">Latest first</option>
                <option value="name">By name</option>
              </select>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-ink-subtle">From</label>
                <input
                  type="date"
                  className={input}
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-ink-subtle">To</label>
                <input
                  type="date"
                  className={input}
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>
          </div>

          {pcoError && (
            <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {pcoError}
            </p>
          )}

          {/* Event list */}
          <div className="mt-3 space-y-3">
            {events === null ? (
              <p className="rounded-xl border border-line bg-card p-6 text-center text-sm text-ink-subtle">
                Loading events…
              </p>
            ) : events.length === 0 && !pcoError ? (
              <p className="rounded-xl border border-dashed border-line bg-card p-6 text-center text-sm text-ink-subtle">
                No upcoming events match.
              </p>
            ) : (
              events.map((ev) => {
                const existing = rsvpByInstance.get(ev.instanceId);
                return (
                  <div
                    key={ev.instanceId}
                    className="rounded-xl border border-line bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-ink">{ev.name}</h3>
                        <p className="mt-0.5 text-xs text-ink-subtle">
                          {fmtWhen(ev.startsAt, ev.allDay)}
                          {ev.location ? ` · ${ev.location}` : ""}
                          {ev.recurrenceDescription
                            ? ` · ${ev.recurrenceDescription}`
                            : ""}
                        </p>
                      </div>
                      {existing && (
                        <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent">
                          {existing.yes} coming
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={creatingId === ev.instanceId}
                        onClick={() => void headcountFor(ev)}
                        className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-brand-contrast transition hover:bg-brand-strong disabled:opacity-50"
                      >
                        {creatingId === ev.instanceId
                          ? "Setting up…"
                          : existing
                            ? "Open headcount →"
                            : "Text out for headcount"}
                      </button>
                      {ev.churchCenterUrl && (
                        <a
                          href={ev.churchCenterUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-line px-3 py-2 text-xs font-medium text-ink transition hover:bg-card-muted"
                        >
                          Church Center ↗
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Manual create */}
      <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
        {!showManual ? (
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="text-sm font-medium text-brand-text hover:underline"
          >
            + New headcount without Planning Center
          </button>
        ) : (
          <form onSubmit={createManual}>
            <h2 className="text-sm font-semibold text-ink">New headcount</h2>
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-xs text-ink-subtle">Event</label>
                <input
                  className={input}
                  value={mTitle}
                  onChange={(e) => setMTitle(e.target.value)}
                  placeholder="Fall Festival"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-ink-subtle">Date</label>
                  <input
                    type="date"
                    className={input}
                    value={mDate}
                    onChange={(e) => setMDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink-subtle">Time</label>
                  <input
                    type="time"
                    className={input}
                    value={mTime}
                    onChange={(e) => setMTime(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-ink-subtle">
                  Location (optional)
                </label>
                <input
                  className={input}
                  value={mLocation}
                  onChange={(e) => setMLocation(e.target.value)}
                  placeholder="Fellowship Hall"
                />
              </div>
            </div>
            {mError && (
              <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                {mError}
              </p>
            )}
            <button
              type="submit"
              disabled={mBusy}
              className="mt-4 w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-brand-contrast transition hover:bg-brand-strong disabled:opacity-50"
            >
              {mBusy ? "Creating…" : "Create headcount page"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
