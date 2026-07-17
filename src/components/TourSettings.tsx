"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TourSettings() {
  const router = useRouter();
  const [showTour, setShowTour] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/app/prefs");
      if (!res.ok) return;
      const data = await res.json();
      setShowTour(Boolean(data.prefs?.showTour));
    } catch {
      /* leave loading */
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function toggle(next: boolean) {
    const prev = showTour;
    setShowTour(next);
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/app/prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showTour: next }),
      });
      if (!res.ok) {
        setShowTour(prev ?? false);
        return;
      }
      setMsg(
        next
          ? "The welcome tour will show next time you open the app."
          : "Tour turned off."
      );
      // Refresh so the layout re-reads the flag (tour appears immediately if on).
      router.refresh();
    } catch {
      setShowTour(prev ?? false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
      <label className="flex cursor-pointer items-center justify-between gap-4">
        <span>
          <span className="block text-sm font-semibold text-ink">
            Welcome tour
          </span>
          <span className="block text-xs text-ink-subtle">
            The quick walkthrough shown on your first sign-in
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={showTour ?? false}
          aria-label="Show the welcome tour"
          disabled={busy || showTour === null}
          onClick={() => void toggle(!showTour)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${
            showTour ? "bg-accent" : "bg-line-strong"
          } disabled:opacity-50`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
              showTour ? "left-[calc(100%-1.625rem)]" : "left-0.5"
            }`}
          />
        </button>
      </label>
      {msg && <p className="mt-2 text-xs text-ink-muted">{msg}</p>}
    </div>
  );
}
