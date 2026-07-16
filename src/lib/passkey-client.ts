"use client";

import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";

export interface PasskeyResult {
  ok: boolean;
  error?: string;
  user?: { id: string; email: string; name: string; isAdmin: boolean };
}

export function passkeySupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined"
  );
}

/** A friendly default name for the passkey being created on this device. */
export function guessDeviceLabel(): string {
  if (typeof navigator === "undefined") return "This device";
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android phone";
  if (/Macintosh|Mac OS X/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows PC";
  if (/CrOS/.test(ua)) return "Chromebook";
  if (/Linux/.test(ua)) return "Linux";
  return "This device";
}

async function readError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return data?.error || fallback;
}

/** Create a passkey for the signed-in organizer on this device. */
export async function registerPasskey(label?: string): Promise<PasskeyResult> {
  let optionsJSON;
  try {
    const res = await fetch("/api/auth/passkey/register/options", {
      method: "POST",
    });
    if (!res.ok) {
      return { ok: false, error: await readError(res, "Could not start setup.") };
    }
    optionsJSON = await res.json();
  } catch {
    return { ok: false, error: "Network error — please try again." };
  }

  let attestation;
  try {
    attestation = await startRegistration({ optionsJSON });
  } catch (e) {
    const err = e as { name?: string; message?: string };
    if (err?.name === "InvalidStateError") {
      return {
        ok: false,
        error: "This device already has a passkey for your account.",
      };
    }
    if (err?.name === "NotAllowedError") {
      return { ok: false, error: "Passkey setup was cancelled." };
    }
    return { ok: false, error: err?.message || "Passkey setup failed." };
  }

  try {
    const res = await fetch("/api/auth/passkey/register/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response: attestation, label }),
    });
    if (!res.ok) {
      return { ok: false, error: await readError(res, "Could not save passkey.") };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error — please try again." };
  }
}

/** Sign in using any passkey for this site (usernameless / cross-device). */
export async function signInWithPasskey(): Promise<PasskeyResult> {
  let optionsJSON;
  try {
    const res = await fetch("/api/auth/passkey/authenticate/options", {
      method: "POST",
    });
    if (!res.ok) {
      return { ok: false, error: await readError(res, "Could not start sign-in.") };
    }
    optionsJSON = await res.json();
  } catch {
    return { ok: false, error: "Network error — please try again." };
  }

  let assertion;
  try {
    assertion = await startAuthentication({ optionsJSON });
  } catch (e) {
    const err = e as { name?: string; message?: string };
    if (err?.name === "NotAllowedError") {
      return { ok: false, error: "Sign-in was cancelled or timed out." };
    }
    return { ok: false, error: err?.message || "Passkey sign-in failed." };
  }

  try {
    const res = await fetch("/api/auth/passkey/authenticate/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response: assertion }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.error || "Passkey not recognized." };
    }
    return { ok: true, user: data.user };
  } catch {
    return { ok: false, error: "Network error — please try again." };
  }
}
