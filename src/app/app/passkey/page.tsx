import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AppHeader from "@/components/AppHeader";
import PasskeySetupCard from "@/components/PasskeySetupCard";

export default async function PasskeySetupPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { welcome } = await searchParams;
  const existingCount = await prisma.credential.count({
    where: { organizerId: session.id },
  });

  return (
    <>
      <AppHeader session={session} active="security" />
      <main className="mx-auto max-w-lg px-4 py-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-text">
          Welcome, {session.name.split(" ")[0]}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink">Faster sign-in</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {welcome
            ? "Your account is ready. Add a passkey so you never need a password."
            : "Add a passkey for password-free sign-in on all your devices."}
        </p>
        <div className="mt-6">
          <PasskeySetupCard
            welcome={welcome === "1"}
            existingCount={existingCount}
          />
        </div>
      </main>
    </>
  );
}
