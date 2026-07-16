"use client";

import { useCallback, useEffect, useState } from "react";
import {
  guessDeviceLabel,
  passkeySupported,
  registerPasskey,
} from "@/lib/passkey-client";

interface Cred {
  id: string;
  deviceLabel: string | null;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string;
  transports: string[];
}

function fmt(d: string): string {
  try {
    return new Date(d).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function PasskeyManager() {
  const [creds, setCreds] = useState<Cred[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/passkey/credentials");
      if (!res.ok) {
        setCreds([]);
        return;
      }
      const data = await res.json();
      setCreds(data.credentials ?? []);
    } catch {
      setCreds([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(passkeySupported());
    void load();
  }, [load]);

  async function add() {
    setBusy(true);
    setError(null);
    setMsg(null);
    const res = await registerPasskey(guessDeviceLabel());
    if (res.ok) {
      setMsg("Passkey added to this device.");
      await load();
    } else {
      setError(res.error ?? "Could not add a passkey.");
    }
    setBusy(false);
  }

  async function remove(id: string) {
    if (!confirm("Remove this passkey? You'll no longer be able to sign in with it.")) {
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/auth/passkey/credentials/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not remove passkey.");
      } else {
        setMsg("Passkey removed.");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {(msg || error) && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            error
              ? "bg-danger-soft text-danger"
              : "bg-accent-soft text-accent"
          }`}
        >
          {error || msg}
        </p>
      )}

      <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Your passkeys</h2>

        {creds === null ? (
          <p className="mt-3 text-sm text-ink-subtle">Loading…</p>
        ) : creds.length === 0 ? (
          <p className="mt-3 text-sm text-ink-subtle">
            No passkeys yet. Add one so you can sign in without a password.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {creds.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {c.deviceLabel || "Passkey"}
                    {c.backedUp && (
                      <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-text">
                        Synced
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-subtle">
                    Added {fmt(c.createdAt)} · Last used {fmt(c.lastUsedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remove(c.id)}
                  className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:border-danger hover:text-danger disabled:opacity-50"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => void add()}
          disabled={busy || !supported}
          className="mt-4 w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-contrast transition hover:bg-brand-strong disabled:opacity-50"
        >
          {busy ? "Follow your device…" : "Add a passkey to this device"}
        </button>
        {!supported && (
          <p className="mt-2 text-xs text-ink-subtle">
            This browser doesn&apos;t support passkeys.
          </p>
        )}
      </div>
    </div>
  );
}
