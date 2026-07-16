import { NextRequest, NextResponse } from "next/server";
import { loginWithPasscode } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "");
    const passcode = String(body.passcode ?? "");
    const user = await loginWithPasscode(email, passcode);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or passcode" },
        { status: 401 }
      );
    }
    return NextResponse.json({ user });
  } catch (err) {
    console.error("[login]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Login failed" },
      { status: 500 }
    );
  }
}
