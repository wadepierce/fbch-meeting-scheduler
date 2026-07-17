"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import LogoutButton from "./LogoutButton";
import type { SessionUser } from "@/lib/auth";

type NavKey = "meetings" | "events" | "polls" | "team" | "security";

export default function AppHeader({
  session,
  active,
}: {
  session: SessionUser;
  active?: NavKey;
}) {
  const [open, setOpen] = useState(false);

  const links: { key: NavKey; href: string; label: string; show: boolean }[] = [
    { key: "meetings", href: "/app", label: "Meetings", show: true },
    { key: "events", href: "/app/events", label: "Events", show: true },
    { key: "polls", href: "/app/polls", label: "Polls", show: true },
    { key: "team", href: "/app/team", label: "Team", show: session.isAdmin },
    { key: "security", href: "/app/security", label: "Account", show: true },
  ].filter((l) => l.show) as typeof links;

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/app"
          className="shrink-0"
          aria-label="FBCH home"
          onClick={() => setOpen(false)}
        >
          <Logo size="sm" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              aria-current={active === l.key ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                active === l.key
                  ? "bg-brand-soft text-brand-text"
                  : "text-ink-muted hover:bg-card-muted hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <span className="mx-1 h-5 w-px bg-line" />
          <ThemeToggle />
          <LogoutButton />
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 sm:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-card text-ink-muted transition hover:bg-card-muted hover:text-ink"
          >
            {open ? (
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
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
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
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {open && (
        <div className="border-t border-line bg-canvas px-4 py-3 sm:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.key}
                href={l.href}
                aria-current={active === l.key ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active === l.key
                    ? "bg-brand-soft text-brand-text"
                    : "text-ink hover:bg-card-muted"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-line pt-3">
              <p className="mb-2 px-1 text-xs text-ink-subtle">
                Signed in as {session.name}
              </p>
              <LogoutButton variant="full" />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
