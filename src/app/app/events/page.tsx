import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isPcoConfigured } from "@/lib/planning-center";
import AppHeader from "@/components/AppHeader";
import EventsClient from "@/components/EventsClient";

export default async function EventsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      <AppHeader session={session} active="events" />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-text">
          Planning Center
        </p>
        <h1 className="text-2xl font-bold text-ink">Events & headcounts</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Pull events from the church calendar, text them out, and count who&apos;s
          coming.
        </p>
        <div className="mt-6">
          <EventsClient pcoConfigured={isPcoConfigured()} />
        </div>
      </main>
    </>
  );
}
