"use client";

import { useCallback, useEffect, useState } from "react";

interface Invite {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  acceptedAt: string | null;
  expiresAt: string;
  createdAt: string;
  url: string;
}

function mailtoFor(inv: { name: string; email: string; url: string }): string {
  const subject = "You're invited to the FBCH Meeting Scheduler";
  const body = `Hi ${inv.name.split(" ")[0] || "there"},

You've been invited to help schedule meetings for First Baptist Church Henrietta.

Open this link to sign in automatically and set up a passkey (no password needed):
${inv.url}

The link works on your phone or computer.`;
  return `mailto:${encodeURIComponent(inv.email)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

export default function InviteManager() {
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/app/invites");
      if (!res.ok) {
        setInvites([]);
        return;
      }
      const data = await res.json();
      setInvites(data.invites ?? []);
    } catch {
      setInvites([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/app/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, isAdmin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create invite");
        return;
      }
      setName("");
      setEmail("");
      setIsAdmin(false);
      await load();
      if (data.invite?.id) setCopiedId(null);
    } finally {
      setBusy(false);
    }
  }

  async function copy(inv: Invite) {
    try {
      await navigator.clipboard.writeText(inv.url);
      setCopiedId(inv.id);
      setTimeout(() => setCopiedId((c) => (c === inv.id ? null : c)), 2000);
    } catch {
      /* clipboard may be blocked; the link is still visible below */
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this invite link? It will stop working.")) return;
    setBusy(true);
    try {
      await fetch(`/api/app/invites/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  const input =
    "mt-1 w-full rounded-xl border border-line bg-card-muted px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle";

  return (
    <div className="space-y-5">
      <form
        onSubmit={create}
        className="rounded-2xl border border-line bg-card p-5 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-ink">Invite someone</h2>
        <p className="mt-1 text-xs text-ink-muted">
          They&apos;ll get a personal link. Opening it signs them in and prompts
          them to create a passkey.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-ink-subtle">
              Name
            </label>
            <input
              className={input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Deacon"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-subtle">
              Email
            </label>
            <input
              type="email"
              className={input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              required
            />
          </div>
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={(e) => setIsAdmin(e.target.checked)}
            className="h-4 w-4 rounded border-line accent-brand"
          />
          Make them an admin (can invite others)
        </label>

        {error && (
          <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-contrast transition hover:bg-brand-strong disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create invite link"}
        </button>
      </form>

      <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Invites</h2>
        {invites === null ? (
          <p className="mt-3 text-sm text-ink-subtle">Loading…</p>
        ) : invites.length === 0 ? (
          <p className="mt-3 text-sm text-ink-subtle">No invites yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="rounded-xl border border-line bg-card-muted p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {inv.name}
                      {inv.isAdmin && (
                        <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-text">
                          Admin
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-ink-subtle">
                      {inv.email}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      inv.acceptedAt
                        ? "bg-accent-soft text-accent"
                        : "bg-card text-ink-subtle ring-1 ring-line"
                    }`}
                  >
                    {inv.acceptedAt ? "Joined" : "Pending"}
                  </span>
                </div>

                <code className="mt-2 block break-all rounded-lg bg-card px-2 py-1.5 text-[11px] text-ink-muted ring-1 ring-line">
                  {inv.url}
                </code>

                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copy(inv)}
                    className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-contrast transition hover:bg-accent-strong"
                  >
                    {copiedId === inv.id ? "Copied!" : "Copy link"}
                  </button>
                  <a
                    href={mailtoFor(inv)}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-card"
                  >
                    Email invite
                  </a>
                  <button
                    type="button"
                    onClick={() => void revoke(inv.id)}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:border-danger hover:text-danger"
                  >
                    Revoke
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
