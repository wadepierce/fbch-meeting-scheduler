"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton({
  variant = "compact",
}: {
  variant?: "compact" | "full";
}) {
  const router = useRouter();
  const cls =
    variant === "full"
      ? "w-full rounded-lg border border-line px-3 py-2.5 text-center text-sm font-medium text-ink-muted transition hover:bg-card-muted hover:text-ink"
      : "rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-card-muted hover:text-ink";
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
      className={cls}
    >
      Sign out
    </button>
  );
}
