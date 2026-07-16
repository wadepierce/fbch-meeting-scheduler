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
    "mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {meeting.status === "DRAFT" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void setStatus("ACTIVE")}
            className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-medium text-white"
          >
            Publish
          </button>
        )}
        {meeting.status === "ACTIVE" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void setStatus("CLOSED")}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            Close poll
          </button>
        )}
        <button
          type="button"
          onClick={() => void copyShare()}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
        >
          Copy share link
        </button>
        <Link
          href={`/m/${meeting.slug}`}
          target="_blank"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          Open poll →
        </Link>
      </div>

      {(msg || err) && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            err ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {err || msg}
        </p>
      )}

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <p className="text-xs font-medium text-slate-500">Share this link</p>
        <code className="mt-1 block break-all text-xs text-slate-700">
          {shareUrl}
        </code>
        <p className="mt-2 text-xs text-slate-500">
          {formatDateRange(meeting.dates)} · {formatTime12(meeting.startTime)}–
          {formatTime12(meeting.endTime)} {timezoneLabel(meeting.timezone)}
        </p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold">
          Responses ({meeting.responses.length})
        </h2>
        {meeting.responses.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Waiting for people to paint availability…
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {meeting.responses.map((r) => (
              <li key={r.id} className="flex justify-between py-2 text-sm">
                <span className="font-medium">{r.displayName}</span>
                <span className="text-slate-500">{r.slots.length} slots</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Pick the final time
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          After you lock it, everyone can download a calendar file for their
          phone.
        </p>

        <label className="mt-3 block text-xs text-slate-500">
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

        <label className="mt-3 block text-xs text-slate-500">Duration</label>
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

        <label className="mt-3 block text-xs text-slate-500">Title</label>
        <input
          className={input}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />

        <label className="mt-3 block text-xs text-slate-500">
          Location (optional)
        </label>
        <input
          className={input}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Fellowship Hall"
        />

        <label className="mt-3 block text-xs text-slate-500">
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
          className="mt-4 w-full rounded-xl bg-sky-700 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {meeting.chosenSlotKey ? "Update meeting" : "Lock time & close poll"}
        </button>

        {meeting.chosenSlotKey && (
          <a
            href={icsUrl}
            className="mt-2 flex w-full items-center justify-center rounded-xl border border-emerald-600 py-3 text-sm font-semibold text-emerald-800"
          >
            Download calendar (.ics)
          </a>
        )}
      </div>
    </div>
  );
}
