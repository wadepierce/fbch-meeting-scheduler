import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchPcoLists, isPcoConfigured } from "@/lib/planning-center";

/** Planning Center People lists for roster import. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPcoConfigured()) {
    return NextResponse.json(
      { error: "Planning Center is not configured", lists: [] },
      { status: 503 }
    );
  }

  try {
    const lists = await fetchPcoLists();
    return NextResponse.json({ lists });
  } catch (e) {
    console.error("[pco/lists]", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Planning Center error",
        lists: [],
      },
      { status: 502 }
    );
  }
}
