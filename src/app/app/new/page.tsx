import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import CreateMeetingForm from "@/components/CreateMeetingForm";

export default async function NewMeetingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Link href="/app" className="text-sm font-medium text-sky-700">
        ← Back
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">
        New availability poll
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Pick days and hours, then share the link so people can paint free times
        on their phones.
      </p>
      <div className="mt-6">
        <CreateMeetingForm />
      </div>
    </main>
  );
}
