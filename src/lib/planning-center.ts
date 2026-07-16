/**
 * Minimal Planning Center Calendar API client.
 *
 * Auth is a Personal Access Token (create one at
 * https://api.planningcenteronline.com/oauth/applications) sent as HTTP Basic
 * `app_id:secret`. PCO_BASE_URL exists so tests can point at a mock server.
 */

export function isPcoConfigured(): boolean {
  return Boolean(process.env.PCO_APP_ID && process.env.PCO_SECRET);
}

function baseUrl(): string {
  return (
    process.env.PCO_BASE_URL?.trim().replace(/\/$/, "") ||
    "https://api.planningcenteronline.com"
  );
}

function authHeader(): string {
  const raw = `${process.env.PCO_APP_ID}:${process.env.PCO_SECRET}`;
  return `Basic ${Buffer.from(raw).toString("base64")}`;
}

/** One upcoming calendar event occurrence, flattened for the UI. */
export interface PcoEvent {
  /** event instance id */
  instanceId: string;
  /** parent event id */
  eventId: string;
  name: string;
  description: string | null;
  startsAt: string; // ISO
  endsAt: string | null;
  allDay: boolean;
  location: string | null;
  approvalStatus: string | null;
  churchCenterUrl: string | null;
  recurrenceDescription: string | null;
}

interface JsonApiResource {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<
    string,
    { data?: { id?: string; type?: string } | null }
  >;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

/**
 * Fetch upcoming event instances (with their parent events) from PCO.
 * Returns up to `perPage` future occurrences ordered by start time.
 */
export async function fetchUpcomingPcoEvents(
  perPage = 100
): Promise<PcoEvent[]> {
  if (!isPcoConfigured()) {
    throw new Error("Planning Center is not configured");
  }

  const url =
    `${baseUrl()}/calendar/v2/event_instances` +
    `?filter=future&order=starts_at&include=event&per_page=${perPage}`;

  const res = await fetch(url, {
    headers: { Authorization: authHeader(), Accept: "application/json" },
    // Church calendars change rarely enough that a short cache is safe.
    next: { revalidate: 60 },
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      "Planning Center rejected the credentials — check PCO_APP_ID / PCO_SECRET"
    );
  }
  if (!res.ok) {
    throw new Error(`Planning Center error (HTTP ${res.status})`);
  }

  const body = (await res.json()) as {
    data?: JsonApiResource[];
    included?: JsonApiResource[];
  };

  const events = new Map<string, JsonApiResource>();
  for (const inc of body.included ?? []) {
    if (inc.type === "Event") events.set(inc.id, inc);
  }

  const out: PcoEvent[] = [];
  for (const inst of body.data ?? []) {
    if (inst.type !== "EventInstance") continue;
    const a = inst.attributes ?? {};
    const eventId = inst.relationships?.event?.data?.id ?? "";
    const ev = eventId ? events.get(eventId) : undefined;
    const evAttr = ev?.attributes ?? {};

    const startsAt = str(a.starts_at);
    if (!startsAt) continue;

    out.push({
      instanceId: inst.id,
      eventId,
      name: str(evAttr.name) ?? str(a.name) ?? "Untitled event",
      description: str(evAttr.description) ?? str(evAttr.summary),
      startsAt,
      endsAt: str(a.ends_at),
      allDay: a.all_day_event === true,
      location: str(a.location),
      approvalStatus: str(evAttr.approval_status),
      churchCenterUrl: str(a.church_center_url) ?? str(evAttr.registration_url),
      recurrenceDescription:
        str(a.recurrence_description) ??
        str(a.compact_recurrence_description),
    });
  }

  out.sort((x, y) => x.startsAt.localeCompare(y.startsAt));
  return out;
}
