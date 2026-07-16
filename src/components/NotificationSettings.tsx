"use client";

import { useCallback, useEffect, useState } from "react";

interface Prefs {
  email: string;
  notifyPollResponses: boolean;
  notifyRsvpReplies: boolean;
}

function Toggle({
  checked,
  onChange,
  disabled,
  label,
  sub,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
  sub: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block text-xs text-ink-subtle">{sub}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked ? "bg-accent" : "bg-line-strong"
        } disabled:opacity-50`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
            checked ? "left-[calc(100%-1.625rem)]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/app/prefs");
      if (!res.ok) return;
      const data = await res.json();
      setPrefs(data.prefs);
      setEmailEnabled(Boolean(data.emailEnabled));
    } catch {
      /* leave loading state */
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function update(patch: Partial<Prefs>) {
    if (!prefs) return;
    const prev = prefs;
    setPrefs({ ...prefs, ...patch }); // optimistic
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/app/prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        setPrefs(prev);
        setError(data.error || "Could not save");
        return;
      }
      setPrefs(data.prefs);
    } catch {
      setPrefs(prev);
      setError("Network error — change not saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-ink">Email notifications</h2>
      {prefs === null ? (
        <p className="mt-3 text-sm text-ink-subtle">Loading…</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-ink-muted">
            Sent to <span className="font-medium text-ink">{prefs.email}</span>
          </p>
          {!emailEnabled && (
            <p className="mt-2 rounded-lg bg-brand-soft px-3 py-2 text-xs text-brand-text">
              Email isn&apos;t set up on the server yet — these will take effect
              once it is.
            </p>
          )}
          {error && (
            <p className="mt-2 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}
          <div className="mt-2 divide-y divide-line">
            <Toggle
              checked={prefs.notifyPollResponses}
              disabled={busy}
              onChange={(v) => void update({ notifyPollResponses: v })}
              label="Meeting poll responses"
              sub="When someone paints availability on a poll you created"
            />
            <Toggle
              checked={prefs.notifyRsvpReplies}
              disabled={busy}
              onChange={(v) => void update({ notifyRsvpReplies: v })}
              label="Headcount replies"
              sub="When someone RSVPs to an event you texted out"
            />
          </div>
        </>
      )}
    </div>
  );
}
