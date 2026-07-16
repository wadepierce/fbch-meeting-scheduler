"use client";

export default function PrintButton({
  label = "Print / Save as PDF",
}: {
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-contrast transition hover:bg-brand-strong"
    >
      {label}
    </button>
  );
}
