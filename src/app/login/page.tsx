"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
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
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <form
        onSubmit={onSubmit}
        className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200"
      >
        <Link href="/" className="text-xs font-medium text-sky-700">
          ← Home
        </Link>
        <h1 className="mt-3 text-xl font-bold text-slate-900">
          Organizer sign in
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Use the email and passcode you were invited with.
        </p>

        <label className="mt-6 block text-xs font-medium text-slate-500">
          Email
        </label>
        <input
          type="email"
          required
          autoComplete="username"
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="mt-4 block text-xs font-medium text-slate-500">
          Passcode
        </label>
        <input
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
        />

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-xl bg-sky-700 py-3 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
