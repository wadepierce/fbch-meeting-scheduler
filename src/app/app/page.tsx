import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateRange } from "@/lib/meeting-poll";
import LogoutButton from "@/components/LogoutButton";

export default async function AppHomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const meetings = await prisma.meeting.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { responses: true } } },
  });

  const statusColor: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-600",
    ACTIVE: "bg-emerald-100 text-emerald-800",
    CLOSED: "bg-amber-100 text-amber-800",
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            Organizer
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Your meetings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Signed in as {session.name}
          </p>
        </div>
        <LogoutButton />
      </div>

      <Link
        href="/app/new"
        className="mt-6 flex w-full items-center justify-center rounded-xl bg-sky-700 px-4 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-800"
      >
        + New availability poll
      </Link>

      <div className="mt-6 space-y-3">
        {meetings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No polls yet. Create one and share the link.
          </p>
        ) : (
          meetings.map((m) => (
            <Link
              key={m.id}
              href={`/app/${m.id}`}
              className="block rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:ring-sky-300"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-slate-900">{m.title}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatDateRange(m.dates)} · {m._count.responses} response
                    {m._count.responses === 1 ? "" : "s"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColor[m.status]}`}
                >
                  {m.status}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
