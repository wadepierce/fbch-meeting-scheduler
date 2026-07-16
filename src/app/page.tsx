import Link from "next/link";
import { getSession } from "@/lib/auth";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

export default async function HomePage() {
  const session = await getSession();

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-4 py-6">
      <div className="flex items-center justify-between">
        <Logo />
        <ThemeToggle />
      </div>

      <div className="flex flex-1 flex-col justify-center py-10">
        <div className="rounded-2xl border border-line bg-card p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-text">
            First Baptist Church Henrietta
          </p>
          <h1 className="mt-2 text-3xl font-bold text-ink">Meeting Scheduler</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Share a link so people can paint the times that work for them. Pick a
            time and everyone can add it to their phone calendar. Organizers sign
            in with a <span className="font-semibold text-ink">passkey</span> — no
            passwords to remember, and your phone can unlock the desktop app too.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            {session ? (
              <Link
                href="/app"
                className="rounded-xl bg-brand px-4 py-3 text-center text-sm font-semibold text-brand-contrast transition hover:bg-brand-strong"
              >
                Open organizer app
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-xl bg-brand px-4 py-3 text-center text-sm font-semibold text-brand-contrast transition hover:bg-brand-strong"
              >
                Organizer sign in
              </Link>
            )}
            <p className="text-center text-xs text-ink-subtle">
              Participants just use the shared meeting link — no account needed.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
