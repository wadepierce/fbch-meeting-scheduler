import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBaseUrl } from "@/lib/base-url";
import { formatViews } from "@/lib/format";
import AppHeader from "@/components/AppHeader";
import MeetingDetailClient from "@/components/MeetingDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MeetingDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      responses: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          displayName: true,
          email: true,
          slots: true,
        },
      },
    },
  });
  if (!meeting) notFound();

  const publicBase = await getBaseUrl();

  return (
    <>
      <AppHeader session={session} active="meetings" />
      <main className="mx-auto max-w-lg px-4 py-8">
        <Link
          href="/app"
          className="text-sm font-medium text-brand-text hover:underline"
        >
          ← All meetings
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink">{meeting.title}</h1>
        <p className="mt-1 text-sm text-ink-subtle">
          {meeting.responses.length} response
          {meeting.responses.length === 1 ? "" : "s"} ·{" "}
          {formatViews(meeting.viewCount)}
          <span className="text-ink-subtle"> of the share link</span>
        </p>
        <div className="mt-4">
          <MeetingDetailClient meeting={meeting} publicBase={publicBase} />
        </div>
      </main>
    </>
  );
}
