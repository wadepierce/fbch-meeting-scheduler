import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import AppHeader from "@/components/AppHeader";
import InviteManager from "@/components/InviteManager";

export default async function TeamPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.isAdmin) redirect("/app");

  const organizers = await prisma.organizer.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      isAdmin: true,
      active: true,
      lastSignedInAt: true,
      createdAt: true,
      _count: { select: { credentials: true } },
    },
  });

  return (
    <>
      <AppHeader session={session} active="team" />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-2xl font-bold text-ink">Team</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Invite organizers by email or a copyable link. Everyone signs in with a
          passkey. Last sign-in is shown for each team member.
        </p>

        <div className="mt-6">
          <InviteManager />
        </div>

        <div className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">
            Organizers ({organizers.length})
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {organizers.map((o) => {
              const lastAbs = formatDateTime(o.lastSignedInAt);
              const lastRel = formatRelativeTime(o.lastSignedInAt);
              return (
                <li
                  key={o.id}
                  className="flex items-start justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {o.name}
                      {o.id === session.id && (
                        <span className="ml-2 text-xs font-normal text-ink-subtle">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-ink-subtle">{o.email}</p>
                    <p
                      className="mt-0.5 text-xs text-ink-muted"
                      title={lastAbs ?? undefined}
                    >
                      Last sign-in:{" "}
                      <span className="font-medium text-ink">{lastRel}</span>
                      {!o.lastSignedInAt && (
                        <span className="text-ink-subtle">
                          {" "}
                          · invited {formatRelativeTime(o.createdAt)}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {o.isAdmin && (
                      <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-text">
                        Admin
                      </span>
                    )}
                    {!o.active && (
                      <span className="rounded-full bg-card-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-ink-subtle ring-1 ring-line">
                        Inactive
                      </span>
                    )}
                    <span className="text-xs text-ink-subtle">
                      {o._count.credentials} passkey
                      {o._count.credentials === 1 ? "" : "s"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </main>
    </>
  );
}
