import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AppHeader from "@/components/AppHeader";
import PasskeyManager from "@/components/PasskeyManager";

export default async function SecurityPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      <AppHeader session={session} active="security" />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-2xl font-bold text-ink">Passkeys</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Signed in as {session.name}. Manage the devices you can use to sign in.
        </p>
        <div className="mt-6">
          <PasskeyManager />
        </div>
        <p className="mt-6 text-xs text-ink-subtle">
          Tip: a passkey saved to your Apple or Google account works on every
          device signed into that account. To sign in on a shared computer, choose
          “use a passkey from a nearby device” and scan the code with your phone.
        </p>
      </main>
    </>
  );
}
