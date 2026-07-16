"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  formatDateRange,
  formatSlotLabel,
  formatTime12,
  generateSlotKeys,
  timezoneLabel,
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
  meetingBody: string | null;
  meetingLocation: string | null;
  responses: {
    id: string;
    displayName: string;
    email: string | null;
    slots: string[];
  }[];
}

export default function MeetingDetailClient({
  meeting: initial,
  publicBase,
}: {
  meeting: Meeting;
  publicBase: string;
}) {
  const router = useRouter();
  const [meeting, setMeeting] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const shareUrl = `${publicBase.replace(/\/$/, "")}/m/${meeting.slug}`;
  const icsUrl = `/api/m/${meeting.slug}/ics`;

  const ranked = useMemo(() => {
    try {
      const keys = generateSlotKeys({
        dates: meeting.dates,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        slotMinutes: meeting.slotMinutes,
        timezone: meeting.timezone,
      });
      return keys
        .map((key) => ({
          key,
          count: meeting.responses.filter((r) => r.slots.includes(key)).length,
        }))
        .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
    } catch {
      return [];
    }
  }, [meeting]);

  const [slotKey, setSlotKey] = useState(meeting.chosenSlotKey ?? "");
  const [duration, setDuration] = useState(
    meeting.meetingDurationMin ?? meeting.durationHintMinutes ?? 60
  );
  const [subject, setSubject] = useState(
    meeting.meetingSubject ?? meeting.title
  );
  const [body, setBody] = useState(meeting.meetingBody ?? "");
  const [location, setLocation] = useState(meeting.meetingLocation ?? "");

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMsg("Link copied — text it or email it.");
    } catch {
      setMsg(shareUrl);
    }
  }

  async function setStatus(status: string) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/app/meetings/${meeting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Failed");
        return;
      }
      setMeeting((m) => ({ ...m, status }));
      setMsg(`Status: ${status}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function finalize() {
    if (!slotKey) {
      setErr("Pick a time first");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/app/meetings/${meeting.id}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotKey,
          durationMinutes: duration,
          subject,
          body,
          location: location || null,
          closePoll: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Failed");
        return;
      }
      setMeeting((m) => ({
        ...m,
        ...data.meeting,
        status: data.meeting.status,
      }));
      setMsg("Meeting locked. Share the calendar file with everyone.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const input =
    "mt-1 w-full rounded-xl border border-line bg-card-muted px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {meeting.status === "DRAFT" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void setStatus("ACTIVE")}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-brand-contrast transition hover:bg-brand-strong"
          >
            Publish
          </button>
        )}
        {meeting.status === "ACTIVE" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void setStatus("CLOSED")}
            className="rounded-lg border border-line px-3 py-2 text-sm text-ink transition hover:bg-card-muted"
          >
            Close poll
          </button>
        )}
        <button
          type="button"
          onClick={() => void copyShare()}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-contrast transition hover:bg-accent-strong"
        >
          Copy share link
        </button>
        <Link
          href={`/m/${meeting.slug}`}
          target="_blank"
          className="rounded-lg border border-line px-3 py-2 text-sm text-ink transition hover:bg-card-muted"
        >
          Open poll →
        </Link>
      </div>

      {(msg || err) && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            err ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent"
          }`}
        >
          {err || msg}
        </p>
      )}

      <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
        <p className="text-xs font-medium text-ink-subtle">Share this link</p>
        <code className="mt-1 block break-all text-xs text-ink-muted">
          {shareUrl}
        </code>
        <p className="mt-2 text-xs text-ink-subtle">
          {formatDateRange(meeting.dates)} · {formatTime12(meeting.startTime)}–
          {formatTime12(meeting.endTime)} {timezoneLabel(meeting.timezone)}
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">
          Responses ({meeting.responses.length})
        </h2>
        {meeting.responses.length === 0 ? (
          <p className="mt-2 text-sm text-ink-subtle">
            Waiting for people to paint availability…
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {meeting.responses.map((r) => (
              <li
                key={r.id}
                className="flex justify-between py-2 text-sm text-ink"
              >
                <span className="font-medium">{r.displayName}</span>
                <span className="text-ink-subtle">{r.slots.length} slots</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-brand/30 bg-brand-soft p-4">
        <h2 className="text-sm font-semibold text-ink">Pick the final time</h2>
        <p className="mt-1 text-xs text-ink-muted">
          After you lock it, everyone can download a calendar file for their
          phone.
        </p>

        <label className="mt-3 block text-xs text-ink-muted">
          Start (most free first)
        </label>
        <select
          className={input}
          value={slotKey}
          onChange={(e) => setSlotKey(e.target.value)}
        >
          <option value="">Select…</option>
          {ranked.map(({ key, count }) => (
            <option key={key} value={key}>
              {formatSlotLabel(key)} — {count}/{meeting.responses.length} free
            </option>
          ))}
        </select>

        <label className="mt-3 block text-xs text-ink-muted">Duration</label>
        <select
          className={input}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        >
          {[30, 45, 60, 90, 120].map((n) => (
            <option key={n} value={n}>
              {n} minutes
            </option>
          ))}
        </select>

        <label className="mt-3 block text-xs text-ink-muted">Title</label>
        <input
          className={input}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />

        <label className="mt-3 block text-xs text-ink-muted">
          Location (optional)
        </label>
        <input
          className={input}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Fellowship Hall"
        />

        <label className="mt-3 block text-xs text-ink-muted">
          Notes (optional)
        </label>
        <textarea
          className={input}
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        <button
          type="button"
          disabled={busy || !slotKey}
          onClick={() => void finalize()}
          className="mt-4 w-full rounded-xl bg-brand py-3 text-sm font-semibold text-brand-contrast transition hover:bg-brand-strong disabled:opacity-50"
        >
          {meeting.chosenSlotKey ? "Update meeting" : "Lock time & close poll"}
        </button>

        {meeting.chosenSlotKey && (
          <div className="mt-2 space-y-2">
            <a
              href={icsUrl}
              className="flex w-full items-center justify-center rounded-xl border border-accent py-3 text-sm font-semibold text-accent transition hover:bg-accent-soft"
            >
              Download calendar (.ics)
            </a>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/app/${meeting.id}/print`}
                className="flex items-center justify-center rounded-xl border border-line py-2.5 text-sm font-medium text-ink transition hover:bg-card-muted"
              >
                Print / PDF
              </Link>
              <a
                href={`/m/${meeting.slug}/opengraph-image`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center rounded-xl border border-line py-2.5 text-sm font-medium text-ink transition hover:bg-card-muted"
              >
                Share image
              </a>
            </div>
            <p className="text-center text-xs text-ink-subtle">
              “Share image” makes a picture you can text or post. Sharing the poll
              link also shows this preview automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
