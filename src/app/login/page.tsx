"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { passkeySupported, signInWithPasskey } from "@/lib/passkey-client";

export default function LoginPage() {
  const router = useRouter();
  const [supported, setSupported] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Passcode fallback
  const [showPasscode, setShowPasscode] = useState(false);
  const [email, setEmail] = useState("");
  const [passcode, setPasscode] = useState("");
  const [pcBusy, setPcBusy] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(passkeySupported());
  }, []);

  async function onPasskey() {
    setBusy(true);
    setError(null);
    const res = await signInWithPasskey();
    if (res.ok) {
      router.push("/app");
      router.refresh();
      return;
    }
    setError(res.error ?? "Sign-in failed");
    setBusy(false);
  }

  async function onPasscode(e: React.FormEvent) {
    e.preventDefault();
    setPcBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, passcode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      router.push("/app");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setPcBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
      <div className="flex items-center justify-between">
        <Link href="/" aria-label="Home">
          <Logo />
        </Link>
        <ThemeToggle />
      </div>

      <div className="flex flex-1 flex-col justify-center py-8">
        <div className="rounded-2xl border border-line bg-card p-8 shadow-sm">
          <h1 className="text-xl font-bold text-ink">Organizer sign in</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Use the passkey on your phone or laptop. On a shared computer you can
            scan a code with your phone to sign in.
          </p>

          {error && (
            <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() => void onPasskey()}
            disabled={busy || !supported}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3.5 text-sm font-semibold text-brand-contrast transition hover:bg-brand-strong disabled:opacity-50"
          >
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
            {busy ? "Waiting for passkey…" : "Sign in with a passkey"}
          </button>

          {!supported && (
            <p className="mt-3 text-xs text-ink-subtle">
              This browser doesn&apos;t support passkeys. Use email &amp; passcode
              below.
            </p>
          )}

          <div className="mt-6 border-t border-line pt-4">
            {!showPasscode ? (
              <button
                type="button"
                onClick={() => setShowPasscode(true)}
                className="text-sm font-medium text-brand-text hover:underline"
              >
                Use email &amp; passcode instead
              </button>
            ) : (
              <form onSubmit={onPasscode}>
                <label className="block text-xs font-medium text-ink-subtle">
                  Email
                </label>
                <input
                  type="email"
                  required
                  autoComplete="username"
                  className="mt-1 w-full rounded-xl border border-line bg-card-muted px-3 py-3 text-base text-ink placeholder:text-ink-subtle"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <label className="mt-4 block text-xs font-medium text-ink-subtle">
                  Passcode
                </label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  className="mt-1 w-full rounded-xl border border-line bg-card-muted px-3 py-3 text-base text-ink placeholder:text-ink-subtle"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                />

                <button
                  type="submit"
                  disabled={pcBusy}
                  className="mt-5 w-full rounded-xl border border-line py-3 text-sm font-semibold text-ink transition hover:bg-card-muted disabled:opacity-50"
                >
                  {pcBusy ? "Signing in…" : "Sign in with passcode"}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-ink-subtle">
          Invited by email? Open your invite link to sign in and create a passkey.
        </p>
      </div>
    </main>
  );
}
