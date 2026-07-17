import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import AppHeader from "@/components/AppHeader";
import PollBuilder from "@/components/PollBuilder";

export default async function NewPollPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      <AppHeader session={session} active="polls" />
      <main className="mx-auto max-w-lg px-4 py-8">
        <Link
          href="/app/polls"
          className="text-sm font-medium text-brand-text hover:underline"
        >
          ← Polls
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink">New poll</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Mix and match question types. People answer from a shared link — one
          vote per device, editable if they change their mind.
        </p>
        <div className="mt-6">
          <PollBuilder />
        </div>
      </main>
    </>
  );
}
