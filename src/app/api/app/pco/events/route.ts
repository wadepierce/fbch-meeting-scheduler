import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchUpcomingPcoEvents, isPcoConfigured } from "@/lib/planning-center";

/**
 * Upcoming Planning Center events for the organizer UI.
 * Query params: q (text search), from / to (YYYY-MM-DD), sort
 * (date-asc | date-desc | name).
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPcoConfigured()) {
    return NextResponse.json({ configured: false, events: [] });
  }

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim().toLowerCase();
  const from = sp.get("from");
  const to = sp.get("to");
  const sort = sp.get("sort") ?? "date-asc";

  let events;
  try {
    events = await fetchUpcomingPcoEvents();
  } catch (e) {
    return NextResponse.json(
      {
        configured: true,
        error: e instanceof Error ? e.message : "Planning Center error",
      },
      { status: 502 }
    );
  }

  if (q) {
    events = events.filter(
      (ev) =>
        ev.name.toLowerCase().includes(q) ||
        (ev.location ?? "").toLowerCase().includes(q) ||
        (ev.description ?? "").toLowerCase().includes(q)
    );
  }
  // Inclusive bounds across all possible timezones (+14:00 earliest, -12:00 latest)
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    const t = Date.parse(`${from}T00:00:00+14:00`);
    events = events.filter((ev) => Date.parse(ev.startsAt) >= t);
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    const t = Date.parse(`${to}T23:59:59-12:00`);
    events = events.filter((ev) => Date.parse(ev.startsAt) <= t);
  }

  if (sort === "name") {
    events.sort((a, b) => a.name.localeCompare(b.name) || a.startsAt.localeCompare(b.startsAt));
  } else if (sort === "date-desc") {
    events.sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  } // date-asc is the fetch default

  return NextResponse.json({ configured: true, events });
}
