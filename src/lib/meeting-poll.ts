/**
 * Meeting availability poll helpers — slot generation, aggregation, ranking.
 * Slot keys are local wall times: "YYYY-MM-DDTHH:mm" in the poll timezone.
 */

export interface PollConfig {
  dates: string[];
  startTime: string; // "HH:mm"
  endTime: string;
  slotMinutes: number;
  durationHintMinutes?: number | null;
  timezone: string;
}

export interface PollResponseLike {
  displayName: string;
  email?: string | null;
  slots: string[];
}

export interface SlotAggregate {
  key: string;
  date: string;
  time: string;
  count: number;
  names: string[];
}

export interface RankedSlot extends SlotAggregate {
  rank: number;
  contiguousMinutes: number;
}

export interface PollSettings {
  notifyEmails?: string[];
  notifyTeamsChannels?: {
    teamId: string;
    teamName: string;
    channelId: string;
    channelName: string;
  }[];
  notifyTeamsUsers?: { email: string; name: string }[];
  /** Predefined Settings → NotificationChannel ids */
  notifyChannelIds?: string[];
  /** Predefined Settings → NotificationRecipient ids */
  notifyRecipientIds?: string[];
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLOT_RE = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):([0-5]\d)$/;

export function parseMinutes(hhmm: string): number {
  const m = TIME_RE.exec(hhmm);
  if (!m) throw new Error(`Invalid time: ${hhmm}`);
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** All valid slot keys for a poll config, sorted date then time. */
export function generateSlotKeys(config: PollConfig): string[] {
  const start = parseMinutes(config.startTime);
  const end = parseMinutes(config.endTime);
  if (end <= start) throw new Error("endTime must be after startTime");
  if (![15, 30, 60].includes(config.slotMinutes)) {
    throw new Error("slotMinutes must be 15, 30, or 60");
  }

  const dates = [...config.dates].filter((d) => DATE_RE.test(d)).sort();
  const keys: string[] = [];
  for (const date of dates) {
    for (let t = start; t < end; t += config.slotMinutes) {
      keys.push(`${date}T${formatMinutes(t)}`);
    }
  }
  return keys;
}

export function isValidSlotKey(key: string, validSet: Set<string>): boolean {
  return SLOT_RE.test(key) && validSet.has(key);
}

export function filterValidSlots(
  slots: string[],
  validKeys: string[]
): string[] {
  const set = new Set(validKeys);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of slots) {
    if (set.has(s) && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

/** Per-slot free counts and who is free. */
export function aggregateResponses(
  responses: PollResponseLike[],
  validKeys: string[]
): SlotAggregate[] {
  const nameMap = new Map<string, string[]>();
  for (const key of validKeys) nameMap.set(key, []);

  for (const r of responses) {
    const name = r.displayName?.trim() || "Anonymous";
    for (const slot of r.slots) {
      const list = nameMap.get(slot);
      if (list) list.push(name);
    }
  }

  return validKeys.map((key) => {
    const [date, time] = key.split("T");
    const names = nameMap.get(key) ?? [];
    return { key, date, time, count: names.length, names };
  });
}

/**
 * Rank slots: highest free count first; for equal counts prefer longer
 * contiguous runs that cover durationHintMinutes (or one slot).
 */
export function rankBestSlots(
  aggregates: SlotAggregate[],
  config: PollConfig,
  limit = 5
): RankedSlot[] {
  if (aggregates.length === 0) return [];

  const byKey = new Map(aggregates.map((a) => [a.key, a]));
  const keys = aggregates.map((a) => a.key);
  const hint = config.durationHintMinutes ?? config.slotMinutes;
  const slotsNeeded = Math.max(1, Math.ceil(hint / config.slotMinutes));

  function contiguousLength(startIdx: number, minCount: number): number {
    const start = aggregates[startIdx];
    if (!start || start.count < minCount) return 0;
    let len = 1;
    let prevMins = parseMinutes(start.time);
    const date = start.date;
    for (let i = startIdx + 1; i < aggregates.length; i++) {
      const cur = aggregates[i];
      if (cur.date !== date) break;
      if (cur.count < minCount) break;
      const curMins = parseMinutes(cur.time);
      if (curMins !== prevMins + config.slotMinutes) break;
      len++;
      prevMins = curMins;
    }
    return len * config.slotMinutes;
  }

  const scored = keys.map((key, idx) => {
    const a = byKey.get(key)!;
    const cont = contiguousLength(idx, a.count);
    const meetsHint = cont >= hint ? 1 : 0;
    return {
      ...a,
      contiguousMinutes: cont,
      score: a.count * 10000 + meetsHint * 1000 + cont,
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.key.localeCompare(b.key);
  });

  // Prefer starts of multi-slot blocks when duration hint spans multiple slots
  const picked: RankedSlot[] = [];
  const used = new Set<string>();
  for (const s of scored) {
    if (s.count === 0) continue;
    if (used.has(s.key)) continue;
    // Skip interior slots of a block if an earlier slot in the same block was better
    picked.push({
      key: s.key,
      date: s.date,
      time: s.time,
      count: s.count,
      names: s.names,
      rank: picked.length + 1,
      contiguousMinutes: Math.max(
        s.contiguousMinutes,
        slotsNeeded * config.slotMinutes
      ),
    });
    used.add(s.key);
    if (picked.length >= limit) break;
  }
  return picked;
}

export function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "meeting";
}

export function formatTime12(hhmm: string): string {
  const mins = parseMinutes(hhmm);
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function formatDateShort(isoDate: string, timeZone?: string): string {
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(timeZone ? { timeZone } : {}),
  });
}

export function formatSlotLabel(key: string, timeZone?: string): string {
  const [date, time] = key.split("T");
  return `${formatDateShort(date, timeZone)} · ${formatTime12(time)}`;
}

export function formatDateRange(dates: string[]): string {
  if (dates.length === 0) return "No dates";
  const sorted = [...dates].sort();
  if (sorted.length === 1) return formatDateShort(sorted[0]);
  return `${formatDateShort(sorted[0])} – ${formatDateShort(sorted[sorted.length - 1])}`;
}

export function timezoneLabel(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
  } catch {
    return tz;
  }
}

/** Build calendar day cells for multi-select (month grid). */
export function buildMonthGrid(year: number, month: number): (string | null)[] {
  // month 0-indexed
  const first = new Date(year, month, 1);
  const startPad = first.getDay(); // 0 Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push(iso);
  }
  return cells;
}

export function heatmapColor(count: number, total: number): string {
  if (total <= 0 || count <= 0) return "transparent";
  const t = count / total;
  if (t < 0.25) return "#dbeafe";
  if (t < 0.5) return "#93c5fd";
  if (t < 0.75) return "#3b82f6";
  if (t < 1) return "#2563eb";
  return "#1d4ed8";
}

export function heatmapTextClass(count: number, total: number): string {
  if (total <= 0 || count <= 0) return "text-gray-400";
  const t = count / total;
  return t >= 0.5 ? "text-white" : "text-blue-900";
}

/** Wall-time components of a slot key in the poll timezone. */
export function splitSlotKey(key: string): { date: string; time: string } {
  const [date, time] = key.split("T");
  if (!date || !time) throw new Error(`Invalid slot key: ${key}`);
  return { date, time };
}

/**
 * Local wall datetime string "YYYY-MM-DDTHH:mm:ss" for Graph/ICS when
 * paired with an IANA timeZone (not UTC).
 */
export function slotLocalDateTime(
  slotKey: string,
  addMinutes = 0
): string {
  const { date, time } = splitSlotKey(slotKey);
  const total = parseMinutes(time) + addMinutes;
  const dayOffset = Math.floor(total / (24 * 60));
  const minsInDay = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  let y = Number(date.slice(0, 4));
  let m = Number(date.slice(5, 7));
  let d = Number(date.slice(8, 10)) + dayOffset;
  // Roll calendar days using UTC noon to avoid DST edge issues on the date part
  const rolled = new Date(Date.UTC(y, m - 1, d));
  const dateStr = `${rolled.getUTCFullYear()}-${String(rolled.getUTCMonth() + 1).padStart(2, "0")}-${String(rolled.getUTCDate()).padStart(2, "0")}`;
  return `${dateStr}T${formatMinutes(minsInDay)}:00`;
}

/** Convert poll-local wall time to a UTC Date (for ICS UTC form). */
export function slotKeyToUtcDate(
  slotKey: string,
  timeZone: string,
  addMinutes = 0
): Date {
  const local = slotLocalDateTime(slotKey, addMinutes);
  const [datePart, timePart] = local.split("T");
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi, s] = timePart.split(":").map(Number);

  // Iteratively find the UTC instant whose wall time in `timeZone` is local
  let utc = Date.UTC(y, mo - 1, d, h, mi, s || 0);
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(utc));
    const get = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value ?? "0");
    const asUtc = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second")
    );
    const wanted = Date.UTC(y, mo - 1, d, h, mi, s || 0);
    utc += wanted - asUtc;
  }
  return new Date(utc);
}

export function formatUtcForIcs(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
  );
}
