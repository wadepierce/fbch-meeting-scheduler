/**
 * FBCH wordmark. The logo is deep navy on transparent, so it's shown on a
 * white chip that keeps it legible in both light and dark themes.
 */
export default function Logo({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const h =
    size === "lg" ? "h-10 sm:h-12" : size === "sm" ? "h-6" : "h-8 sm:h-9";
  return (
    <span
      className={`inline-flex items-center rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-black/5 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/fbch-logo.png"
        alt="First Baptist Church Henrietta"
        width={502}
        height={108}
        className={`${h} w-auto`}
      />
    </span>
  );
}
