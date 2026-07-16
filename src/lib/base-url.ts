import { headers } from "next/headers";

/**
 * Absolute origin for building shareable links (invites, poll links).
 * Prefers APP_URL, then the incoming request host, then Railway's domain.
 */
export async function getBaseUrl(): Promise<string> {
  const envUrl = process.env.APP_URL?.trim().replace(/\/$/, "");
  if (envUrl) return envUrl;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto =
      h.get("x-forwarded-proto") ??
      (host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https");
    return `${proto}://${host}`;
  }

  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  return "http://localhost:3000";
}
