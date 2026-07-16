import Link from "next/link";
import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSession();

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
          First Baptist Church Henrietta
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Meeting Scheduler
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Create a shareable link so people can paint the times that work for
          them. When you pick a time, everyone can add it to their phone
          calendar.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          {session ? (
            <Link
              href="/app"
              className="rounded-xl bg-sky-700 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-sky-800"
            >
              Open organizer app
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-xl bg-sky-700 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-sky-800"
            >
              Organizer sign in
            </Link>
          )}
          <p className="text-center text-xs text-slate-400">
            Participants use a shared meeting link — no account needed.
          </p>
        </div>
      </div>
    </main>
  );
}
