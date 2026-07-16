import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import AppHeader from "@/components/AppHeader";
import CreateMeetingForm from "@/components/CreateMeetingForm";

export default async function NewMeetingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      <AppHeader session={session} active="meetings" />
      <main className="mx-auto max-w-lg px-4 py-8">
        <Link
          href="/app"
          className="text-sm font-medium text-brand-text hover:underline"
        >
          ← Back
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink">
          New availability poll
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Pick days and hours, then share the link so people can paint free times
          on their phones.
        </p>
        <div className="mt-6">
          <CreateMeetingForm />
        </div>
      </main>
    </>
  );
}
