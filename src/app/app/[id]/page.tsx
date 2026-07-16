import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
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

  const publicBase =
    process.env.APP_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "http://localhost:3000");

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Link href="/app" className="text-sm font-medium text-sky-700">
        ← All meetings
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">{meeting.title}</h1>
      <div className="mt-4">
        <MeetingDetailClient meeting={meeting} publicBase={publicBase} />
      </div>
    </main>
  );
}
