import Link from "next/link";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

const MESSAGES: Record<string, { title: string; body: string }> = {
  expired: {
    title: "This invite has expired",
    body: "Invite links are good for a couple of weeks. Ask whoever invited you to send a fresh link.",
  },
  "not-found": {
    title: "We couldn't find that invite",
    body: "The link may be incomplete or already removed. Double-check the link, or ask for a new one.",
  },
  server: {
    title: "Something went wrong",
    body: "We hit a snag opening that invite. Please try the link again in a moment.",
  },
};

export default async function InviteErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const msg = MESSAGES[reason ?? ""] ?? MESSAGES["not-found"];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
      <div className="flex items-center justify-between">
        <Logo />
        <ThemeToggle />
      </div>
      <div className="flex flex-1 flex-col justify-center py-8">
        <div className="rounded-2xl border border-line bg-card p-8 shadow-sm">
          <h1 className="text-xl font-bold text-ink">{msg.title}</h1>
          <p className="mt-2 text-sm text-ink-muted">{msg.body}</p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-contrast transition hover:bg-brand-strong"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
