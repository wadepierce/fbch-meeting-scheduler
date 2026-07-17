"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Step {
  title: string;
  body: string;
  icon: React.ReactNode;
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </svg>
  );
}

const STEPS: Step[] = [
  {
    title: "Welcome to your scheduler",
    body: "A quick 60-second tour of what you can do. You can skip it anytime and bring it back later from your Account page.",
    icon: (
      <Icon>
        <path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </Icon>
    ),
  },
  {
    title: "Meetings — find a time",
    body: "Create an availability poll, share the link, and everyone paints the times they're free. Lock in the best time and send a calendar invite.",
    icon: (
      <Icon>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18M8 15l2 2 4-4" />
      </Icon>
    ),
  },
  {
    title: "Events — from Planning Center",
    body: "Pull upcoming events straight from your church calendar. Search, filter by date, and sort — no re-typing.",
    icon: (
      <Icon>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </Icon>
    ),
  },
  {
    title: "Headcounts — text it out",
    body: "Turn any event into a tap-to-RSVP link. Text it from your phone; people answer I'll be there / Maybe / Can't and how many they're bringing. You get a live count.",
    icon: (
      <Icon>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </Icon>
    ),
  },
  {
    title: "Polls — quick questions",
    body: "Ask a question with ratings, scales, this-or-that, or multiple choice. One vote per phone, results update live. Great for VBS themes or meal counts.",
    icon: (
      <Icon>
        <path d="M18 20V10M12 20V4M6 20v-6" />
      </Icon>
    ),
  },
  {
    title: "Team & your account",
    body: "Admins invite others from Team. On Account you manage your passkey sign-in, email notifications — and can replay this tour whenever you like.",
    icon: (
      <Icon>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </Icon>
    ),
  },
];

export default function WelcomeTour({ open }: { open: boolean }) {
  const router = useRouter();
  const [visible, setVisible] = useState(open);
  const [i, setI] = useState(0);
  const [dismissing, setDismissing] = useState(false);

  // Close on Escape (counts as skip)
  useEffect(() => {
    if (!visible) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") void dismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  async function dismiss() {
    if (dismissing) return;
    setDismissing(true);
    setVisible(false);
    // Persist so it never shows again until re-enabled on Account.
    try {
      await fetch("/api/app/prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showTour: false }),
      });
    } catch {
      /* best effort — closing the overlay is what the user sees */
    }
    router.refresh();
  }

  if (!visible) return null;

  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-text">
            {step.icon}
          </span>
          <button
            type="button"
            onClick={() => void dismiss()}
            className="text-sm font-medium text-ink-subtle transition hover:text-ink"
          >
            Skip tour
          </button>
        </div>

        <h2 id="tour-title" className="mt-4 text-xl font-bold text-ink">
          {step.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {step.body}
        </p>

        {/* progress dots */}
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
            onClick={() => (last ? void dismiss() : setI((n) => n + 1))}
            className="ml-auto rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-contrast transition hover:bg-brand-strong"
          >
            {last ? "Get started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
