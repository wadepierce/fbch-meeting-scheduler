"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PollStatusButtons({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(next: "OPEN" | "CLOSED") {
    setBusy(true);
    try {
      await fetch(`/api/app/polls/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this poll and all its answers? The link will stop working.")) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/app/polls/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/app/polls");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "OPEN" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void setStatus("CLOSED")}
          className="rounded-lg border border-line px-3 py-2 text-sm text-ink transition hover:bg-card-muted disabled:opacity-50"
        >
          Close poll
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void setStatus("OPEN")}
          className="rounded-lg border border-line px-3 py-2 text-sm text-ink transition hover:bg-card-muted disabled:opacity-50"
        >
          Reopen
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => void remove()}
        className="rounded-lg border border-line px-3 py-2 text-sm text-ink-muted transition hover:border-danger hover:text-danger disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
