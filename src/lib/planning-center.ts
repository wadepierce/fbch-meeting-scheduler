/**
 * Minimal Planning Center API client (Calendar + People lists).
 *
 * Auth is a Personal Access Token (create one at
 * https://api.planningcenteronline.com/oauth/applications) sent as HTTP Basic
 * `app_id:secret`. PCO_BASE_URL exists so tests can point at a mock server.
 *
 * The same PAT must include People access to import lists (not only Calendar).
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

/** A Planning Center People list the organizer can import. */
export interface PcoList {
  id: string;
  name: string;
  description: string | null;
  /** Cached total when PCO provides it */
  totalPeople: number | null;
}

/** A person from a PCO list, with best-effort mobile number. */
export interface PcoListPerson {
  pcoPersonId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string | null;
}

interface JsonApiResource {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<
    string,
    {
      data?:
        | { id?: string; type?: string }
        | { id?: string; type?: string }[]
        | null;
    }
  >;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

async function pcoGet(pathOrUrl: string): Promise<Response> {
  if (!isPcoConfigured()) {
    throw new Error("Planning Center is not configured");
  }
  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : `${baseUrl()}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
  return fetch(url, {
    headers: { Authorization: authHeader(), Accept: "application/json" },
    // List membership changes often enough that we prefer fresh data.
    cache: "no-store",
  });
}

function throwIfPcoFailed(res: Response, context: string): void {
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      "Planning Center rejected the credentials — check PCO_APP_ID / PCO_SECRET and that the token has People access"
    );
  }
  if (!res.ok) {
    throw new Error(`Planning Center ${context} error (HTTP ${res.status})`);
  }
}

/** Prefer Mobile, then primary, then any number. */
function pickPhone(
  phones: { number: string | null; location: string | null; primary: boolean }[]
): string | null {
  if (phones.length === 0) return null;
  const scored = phones
    .filter((p) => p.number)
    .map((p) => {
      const loc = (p.location || "").toLowerCase();
      let score = 0;
      if (loc.includes("mobile") || loc.includes("cell")) score += 100;
      if (p.primary) score += 50;
      if (loc.includes("home")) score += 10;
      return { number: p.number as string, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0]?.number ?? null;
}

function relIds(
  rel:
    | {
        data?:
          | { id?: string; type?: string }
          | { id?: string; type?: string }[]
          | null;
      }
    | undefined
): string[] {
  const data = rel?.data;
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.map((d) => d.id).filter((id): id is string => Boolean(id));
  }
  return data.id ? [data.id] : [];
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

/**
 * Fetch People lists (for headcount roster import).
 * Paginates until exhausted (cap pages to avoid runaway).
 */
export async function fetchPcoLists(maxPages = 10): Promise<PcoList[]> {
  const out: PcoList[] = [];
  let next: string | null =
    `/people/v2/lists?order=name&per_page=100`;

  for (let page = 0; page < maxPages && next; page += 1) {
    const res = await pcoGet(next);
    throwIfPcoFailed(res, "lists");
    const body = (await res.json()) as {
      data?: JsonApiResource[];
      links?: { next?: string | null };
    };

    for (const row of body.data ?? []) {
      if (row.type !== "List") continue;
      const a = row.attributes ?? {};
      out.push({
        id: row.id,
        name: str(a.name) ?? "Untitled list",
        description: str(a.description),
        totalPeople:
          num(a.total_people) ??
          num(a.people_count) ??
          num(a.list_results_count),
      });
    }

    next = body.links?.next ?? null;
  }

  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

/**
 * Load people on a Planning Center list with phone numbers.
 * Uses `/lists/{id}/people?include=phone_numbers` and follows pagination.
 */
export async function fetchPcoListPeople(
  listId: string,
  maxPages = 20
): Promise<PcoListPerson[]> {
  if (!listId.trim()) {
    throw new Error("List id is required");
  }

  const people = new Map<string, PcoListPerson>();
  let next: string | null =
    `/people/v2/lists/${encodeURIComponent(listId)}/people` +
    `?include=phone_numbers&per_page=100`;

  for (let page = 0; page < maxPages && next; page += 1) {
    const res = await pcoGet(next);
    throwIfPcoFailed(res, "list people");
    const body = (await res.json()) as {
      data?: JsonApiResource[];
      included?: JsonApiResource[];
      links?: { next?: string | null };
    };

    const phonesById = new Map<
      string,
      { number: string | null; location: string | null; primary: boolean }
    >();
    for (const inc of body.included ?? []) {
      if (inc.type !== "PhoneNumber") continue;
      const a = inc.attributes ?? {};
      phonesById.set(inc.id, {
        number: str(a.number) ?? str(a.e164) ?? str(a.national),
        location: str(a.location),
        primary: a.primary === true,
      });
    }

    for (const row of body.data ?? []) {
      if (row.type !== "Person") continue;
      const a = row.attributes ?? {};
      const first =
        str(a.first_name) ?? str(a.given_name) ?? str(a.nickname) ?? "";
      const last = str(a.last_name) ?? str(a.family_name) ?? "";
      const display =
        str(a.name) ||
        [first, last].filter(Boolean).join(" ") ||
        "Unknown";

      const phoneIds = relIds(row.relationships?.phone_numbers);
      const phones = phoneIds
        .map((id) => phonesById.get(id))
        .filter(
          (
            p
          ): p is {
            number: string | null;
            location: string | null;
            primary: boolean;
          } => Boolean(p)
        );

      // Prefer first non-empty name fields
      const firstName = first || display.split(/\s+/)[0] || "Friend";
      const lastName = last || display.split(/\s+/).slice(1).join(" ");

      people.set(row.id, {
        pcoPersonId: row.id,
        firstName,
        lastName,
        displayName: display,
        phone: pickPhone(phones),
      });
    }

    next = body.links?.next ?? null;
  }

  return Array.from(people.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );
}
