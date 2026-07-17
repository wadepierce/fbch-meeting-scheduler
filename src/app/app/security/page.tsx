import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AppHeader from "@/components/AppHeader";
import PasskeyManager from "@/components/PasskeyManager";
import NotificationSettings from "@/components/NotificationSettings";
import TourSettings from "@/components/TourSettings";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      <AppHeader session={session} active="security" />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-2xl font-bold text-ink">Your account</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Signed in as {session.name}. Notifications and sign-in devices are
          yours to manage.
        </p>

        <div className="mt-6">
          <NotificationSettings />
        </div>

        <div className="mt-4">
          <TourSettings />
        </div>

        <h2 className="mt-8 text-lg font-semibold text-ink">Passkeys</h2>
        <p className="mt-1 text-sm text-ink-muted">
          The devices you can use to sign in.
        </p>
        <div className="mt-3">
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
