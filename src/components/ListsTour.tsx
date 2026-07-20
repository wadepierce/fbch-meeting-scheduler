"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "fbch_lists_tour_v1";

interface Step {
  title: string;
  body: string;
  tip?: string;
}

const STEPS: Step[] = [
  {
    title: "Text lists — the idea",
    body: "On a headcount you can import a Planning Center People list (or add names by hand). Each person gets their own RSVP link. You text them one at a time from your phone, and this page shows who you texted, who opened the link, and who replied.",
    tip: "This never changes or deletes anything in Planning Center — only this app’s headcount list.",
  },
  {
    title: "Two kinds of links",
    body: "Shared link (green “Text it” at the top): one link for a group chat. Everyone types their own name. Personal Text (on each person’s card): a unique link for that person only — their name is already filled in, and you can track opens and replies on their card.",
    tip: "Don’t forward someone’s personal message to other people. That link is only for them.",
  },
  {
    title: "Import a Planning Center list",
    body: "Under “Import from Planning Center,” pick a People list and tap Import list. We load names and mobile numbers and create a personal link for each person. You can import again later to add new people or refresh phones without wiping who you already texted or who replied.",
  },
  {
    title: "Customize the text message",
    body: "Edit the message once. Use tokens like %first%, %event%, %when%, %where%, and %link%. Preview shows how it will look. Save message, then Text uses that template for everyone — each person still gets their own %link%.",
  },
  {
    title: "Text one person at a time",
    body: "On each card: Text opens Messages with their number and the filled-in message. Send it, then go to the next person. Status badges show Ready → Texted → Opened → Coming / Maybe / Can’t. Use filters (Need text, Waiting, Replied) to work through the list.",
    tip: "Tapped Text by mistake? Use Not sent so they go back to Ready and your counts stay honest.",
  },
  {
    title: "Replies and party size",
    body: "When they open their personal link, their name is already there. They pick I’ll be there / Maybe / Can’t and how many people total. If they change the number later, it replaces the old answer — it does not add on top. Shared-link replies (no personal link) show under “Other replies.”",
  },
];

export function markListsTourSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function hasSeenListsTour(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

/**
 * Walkthrough for headcount personal lists / PCO import / per-person texting.
 * Open from the headcount page anytime; optionally auto-shows once per browser.
 */
export default function ListsTour({
  open,
  onClose,
  autoOffer = false,
}: {
  open: boolean;
  onClose: () => void;
  /** If true, opens once for users who haven’t seen it (localStorage). */
  autoOffer?: boolean;
}) {
  const [visible, setVisible] = useState(open);
  const [i, setI] = useState(0);

  useEffect(() => {
    setVisible(open);
    if (open) setI(0);
  }, [open]);

  useEffect(() => {
    if (!autoOffer || open) return;
    if (hasSeenListsTour()) return;
    setVisible(true);
    setI(0);
  }, [autoOffer, open]);

  function close(markSeen = true) {
    if (markSeen) markListsTourSeen();
    setVisible(false);
    onClose();
  }

  useEffect(() => {
    if (!visible) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lists-tour-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-text">
            <svg
              className="h-7 w-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          <button
            type="button"
            onClick={() => close()}
            className="text-sm font-medium text-ink-subtle transition hover:text-ink"
          >
            Close
          </button>
        </div>

        <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-brand-text">
          Lists tutorial
        </p>
        <h2 id="lists-tour-title" className="mt-1 text-xl font-bold text-ink">
          {step.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.body}</p>
        {step.tip && (
          <p className="mt-3 rounded-xl bg-brand-soft px-3 py-2 text-xs leading-relaxed text-brand-text">
            <span className="font-semibold">Tip: </span>
            {step.tip}
          </p>
        )}

        <div className="mt-5 flex items-center gap-1.5">
          {STEPS.map((_, j) => (
            <span
              key={j}
              className={`h-1.5 rounded-full transition-all ${
                j === i ? "w-5 bg-brand" : "w-1.5 bg-line-strong"
              }`}
            />
          ))}
          <span className="ml-auto text-xs text-ink-subtle">
            {i + 1} / {STEPS.length}
          </span>
        </div>

        <div className="mt-5 flex items-center gap-2">
          {i > 0 && (
            <button
              type="button"
              onClick={() => setI((n) => n - 1)}
              className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-card-muted"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={() => (last ? close() : setI((n) => n + 1))}
            className="ml-auto rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-contrast transition hover:bg-brand-strong"
          >
            {last ? "Got it" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
