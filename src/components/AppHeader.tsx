import Link from "next/link";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import LogoutButton from "./LogoutButton";
import type { SessionUser } from "@/lib/auth";

type NavKey = "meetings" | "team" | "security";

export default function AppHeader({
  session,
  active,
}: {
  session: SessionUser;
  active?: NavKey;
}) {
  const links: { key: NavKey; href: string; label: string; show: boolean }[] = [
    { key: "meetings", href: "/app", label: "Meetings", show: true },
    { key: "team", href: "/app/team", label: "Team", show: session.isAdmin },
    { key: "security", href: "/app/security", label: "Passkeys", show: true },
  ];

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/app" className="shrink-0" aria-label="FBCH home">
          <Logo size="sm" />
        </Link>

        <nav className="flex items-center gap-1">
          {links
            .filter((l) => l.show)
            .map((l) => (
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
          <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
          <ThemeToggle />
          <span className="hidden sm:block">
            <LogoutButton />
          </span>
        </nav>
      </div>
    </header>
  );
}
