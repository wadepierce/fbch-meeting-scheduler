"use client";

import { useState } from "react";

/**
 * Share buttons for texting a link out. "Text it" opens the phone's Messages
 * app prefilled (sms: deep link); Web Share is used when available; copy is
 * the universal fallback.
 */
export default function ShareActions({
  message,
  url,
  compact = false,
}: {
  message: string;
  url: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState<"msg" | "link" | null>(null);

  async function copy(text: string, which: "msg" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied((c) => (c === which ? null : c)), 2000);
    } catch {
      /* clipboard blocked — the sms/share paths still work */
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ text: message });
    } catch {
      /* user cancelled */
    }
  }

  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const btn = compact
    ? "rounded-lg px-3 py-1.5 text-xs font-semibold"
    : "rounded-xl px-4 py-2.5 text-sm font-semibold";
  const btnGhost = compact
    ? "rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-card-muted"
    : "rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-card-muted";

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={`sms:?&body=${encodeURIComponent(message)}`}
        className={`${btn} bg-accent text-accent-contrast transition hover:bg-accent-strong`}
      >
        Text it
      </a>
      {canNativeShare && (
        <button type="button" onClick={() => void nativeShare()} className={btnGhost}>
          Share…
        </button>
      )}
      <button
        type="button"
        onClick={() => void copy(message, "msg")}
        className={btnGhost}
      >
        {copied === "msg" ? "Copied!" : "Copy message"}
      </button>
      <button
        type="button"
        onClick={() => void copy(url, "link")}
        className={btnGhost}
      >
        {copied === "link" ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
