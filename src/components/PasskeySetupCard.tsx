"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  guessDeviceLabel,
  passkeySupported,
  registerPasskey,
} from "@/lib/passkey-client";

export default function PasskeySetupCard({
  welcome = false,
  existingCount = 0,
}: {
  welcome?: boolean;
  existingCount?: number;
}) {
  const router = useRouter();
  const [supported, setSupported] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(passkeySupported());
  }, []);

  async function onCreate() {
    setBusy(true);
    setError(null);
    const res = await registerPasskey(guessDeviceLabel());
    if (res.ok) {
      setDone(true);
      router.refresh();
    } else {
      setError(res.error ?? "Could not create a passkey.");
    }
    setBusy(false);
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-line bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 text-accent">
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <h2 className="text-lg font-semibold text-ink">Passkey created</h2>
        </div>
        <p className="mt-2 text-sm text-ink-muted">
          You can now sign in with your face, fingerprint, or device PIN. If this
          passkey is saved to your Apple or Google account, it&apos;ll follow you
          to your other devices automatically. On a desktop without it, choose{" "}
          <span className="font-medium text-ink">“a passkey from a nearby
          device”</span>{" "}
          and scan the code with this phone.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/app"
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-contrast transition hover:bg-brand-strong"
          >
            Continue to meetings
          </Link>
          <button
            type="button"
            onClick={() => setDone(false)}
            className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-card-muted"
          >
            Add another device
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-text">
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="10" cy="8" r="4" />
            <path d="M10 12c-3.3 0-6 2.2-6 5v1h8" />
            <circle cx="17.5" cy="14.5" r="2.5" />
            <path d="M17.5 17v4l-1.2-1-1.3 1v-2.2" />
          </svg>
        </span>
        <div>
          <h2 className="text-lg font-semibold text-ink">
            {welcome ? "You're signed in! " : ""}
            {existingCount > 0
              ? "Add another passkey"
              : "Set up a passkey"}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            A passkey replaces passwords with your device&apos;s face, fingerprint,
            or PIN. Set one up on this device and you can also use it to sign in on
            your desktop by scanning a code.
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void onCreate()}
          disabled={busy || !supported}
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-contrast transition hover:bg-brand-strong disabled:opacity-50"
        >
          {busy ? "Follow your device…" : "Create a passkey"}
        </button>
        <Link
          href="/app"
          className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-card-muted"
        >
          {existingCount > 0 ? "Done" : "Skip for now"}
        </Link>
      </div>

      {!supported && (
        <p className="mt-3 text-xs text-ink-subtle">
          This browser doesn&apos;t support passkeys. Try Safari on iPhone, or
          Chrome/Edge on desktop.
        </p>
      )}
    </div>
  );
}
