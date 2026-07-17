import { headers } from "next/headers";

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * Turn a request Host (possibly `host:port`, possibly comma-joined by proxies)
 * into a clean absolute origin. Production links must never carry a port —
 * public sites answer on 443/80 — so the port is dropped for non-local hosts.
 * (Keeping an internal port is what triggers the browser's "restricted port"
 * error when the link is opened elsewhere.)
 */
export function baseUrlFromHost(
  rawHost: string | null | undefined,
  rawProto: string | null | undefined
): string | null {
  if (!rawHost) return null;
  const host = rawHost.split(",")[0].trim();
  if (!host) return null;

  const hostname = host.split(":")[0];
  const local = isLocalHostname(hostname);
  const proto =
    (rawProto?.split(",")[0].trim() || "") || (local ? "http" : "https");
  // Keep the port only for localhost dev; strip it in production.
  const finalHost = local ? host : hostname;
  return `${proto}://${finalHost}`;
}

/**
 * Absolute origin for building shareable links (invites, polls, RSVPs).
 * Priority: APP_URL (explicit) → Railway's canonical public domain (always
 * clean, no internal port) → the request host (port stripped) → localhost.
 */
export async function getBaseUrl(): Promise<string> {
  const envUrl = process.env.APP_URL?.trim().replace(/\/$/, "");
  if (envUrl) return envUrl;

  const railway = process.env.RAILWAY_PUBLIC_DOMAIN?.trim().replace(/\/$/, "");
  if (railway) return `https://${railway}`;

  const h = await headers();
  const derived = baseUrlFromHost(
    h.get("x-forwarded-host") ?? h.get("host"),
    h.get("x-forwarded-proto")
  );
  if (derived) return derived;

  return "http://localhost:3000";
}
