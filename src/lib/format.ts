/** Human-friendly relative time for admin surfaces (e.g. last sign-in). */
export function formatRelativeTime(
  date: Date | string | null | undefined
): string {
  if (!date) return "Never";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "Never";

  const now = Date.now();
  const diffSec = Math.round((d.getTime() - now) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (abs < 60) return rtf.format(diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHr = Math.round(diffSec / 3600);
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, "hour");
  const diffDay = Math.round(diffSec / 86400);
  if (Math.abs(diffDay) < 30) return rtf.format(diffDay, "day");
  const diffMo = Math.round(diffSec / 2_592_000);
  if (Math.abs(diffMo) < 12) return rtf.format(diffMo, "month");
  return rtf.format(Math.round(diffSec / 31_536_000), "year");
}

/** Absolute local date/time for tooltips and secondary lines. */
export function formatDateTime(
  date: Date | string | null | undefined
): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** e.g. "1 view" / "12 views" */
export function formatViews(count: number): string {
  const n = Math.max(0, Math.floor(count || 0));
  return `${n} view${n === 1 ? "" : "s"}`;
}
