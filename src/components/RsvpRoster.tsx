"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_RSVP_MESSAGE_TEMPLATE,
  fillRsvpMessageTemplate,
  inviteeStatus,
  inviteeStatusLabel,
  normalizePhoneForSms,
  personalRsvpUrl,
  smsHref,
  type InviteeStatus,
} from "@/lib/rsvp";
import { formatRelativeTime } from "@/lib/format";
import ListsTour from "@/components/ListsTour";

export type RosterInvitee = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string | null;
  token: string;
  textedAt: string | null;
  textedById?: string | null;
  textedByName?: string | null;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
  openCount: number;
  addedById?: string | null;
  addedByName?: string | null;
  response: {
    id: string;
    answer: string;
    count: number;
    updatedAt: string;
  } | null;
};

type FilterKey =
  | "all"
  | "coming"
  | "maybe"
  | "cant"
  | "no_reply"
  | "need_text"
  | "waiting"
  | "no_phone";

type PcoListOption = {
  id: string;
  name: string;
  description: string | null;
  totalPeople: number | null;
};

const STATUS_PILL: Record<InviteeStatus, string> = {
  NO_PHONE: "bg-card-muted text-ink-subtle ring-1 ring-line",
  READY: "bg-brand-soft text-brand-text",
  TEXTED: "bg-card-muted text-ink-muted ring-1 ring-line",
  OPENED: "bg-brand-soft text-brand-text",
  YES: "bg-accent-soft text-accent",
  MAYBE: "bg-brand-soft text-brand-text",
  NO: "bg-card-muted text-ink-subtle ring-1 ring-line",
};

export default function RsvpRoster({
  rsvpId,
  slug,
  publicBase,
  title,
  when,
  location,
  initialTemplate,
  initialInvitees,
  closed,
  pcoConfigured = false,
  /** Signed-in organizer — shown so the team knows who is working this list */
  currentUserName = null,
}: {
  rsvpId: string;
  slug: string;
  publicBase: string;
  title: string;
  when: string;
  location: string | null;
  initialTemplate: string | null;
  initialInvitees: RosterInvitee[];
  closed: boolean;
  pcoConfigured?: boolean;
  currentUserName?: string | null;
}) {
  const router = useRouter();
  const [invitees, setInvitees] = useState(initialInvitees);
  const [template, setTemplate] = useState(
    initialTemplate?.trim() || DEFAULT_RSVP_MESSAGE_TEMPLATE
  );
  const [templateDirty, setTemplateDirty] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [templateMsg, setTemplateMsg] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [pcoLists, setPcoLists] = useState<PcoListOption[] | null>(null);
  const [pcoListId, setPcoListId] = useState("");
  const [pcoListsError, setPcoListsError] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterKey>("all");
  const [err, setErr] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [listsTourOpen, setListsTourOpen] = useState(false);

  const base = publicBase.replace(/\/$/, "");

  useEffect(() => {
    if (!pcoConfigured || closed) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/app/pco/lists");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setPcoListsError(data.error || "Could not load Planning Center lists");
          setPcoLists([]);
          return;
        }
        setPcoLists(data.lists ?? []);
        setPcoListsError(null);
      } catch {
        if (!cancelled) {
          setPcoListsError("Network error loading lists");
          setPcoLists([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pcoConfigured, closed]);

  const counts = useMemo(() => {
    let needText = 0;
    let textedNoOpen = 0;
    let opened = 0;
    let coming = 0;
    let maybe = 0;
    let cant = 0;
    let comingHeads = 0;
    let maybeHeads = 0;
    let noPhone = 0;
    for (const inv of invitees) {
      const s = inviteeStatus(inv);
      if (s === "YES") {
        coming += 1;
        comingHeads += inv.response?.count ?? 1;
      } else if (s === "MAYBE") {
        maybe += 1;
        maybeHeads += inv.response?.count ?? 1;
      } else if (s === "NO") {
        cant += 1;
      } else if (s === "OPENED") opened += 1;
      else if (s === "TEXTED") textedNoOpen += 1;
      else if (s === "NO_PHONE") noPhone += 1;
      else if (s === "READY") needText += 1;
    }
    const replied = coming + maybe + cant;
    const noReply = invitees.length - replied;
    return {
      total: invitees.length,
      needText,
      textedNoOpen,
      opened,
      coming,
      maybe,
      cant,
      comingHeads,
      maybeHeads,
      replied,
      noReply,
      waiting: textedNoOpen + opened,
      noPhone,
    };
  }, [invitees]);

  const filtered = useMemo(() => {
    return invitees.filter((inv) => {
      const s = inviteeStatus(inv);
      switch (filter) {
        case "coming":
          return s === "YES";
        case "maybe":
          return s === "MAYBE";
        case "cant":
          return s === "NO";
        case "no_reply":
          return s !== "YES" && s !== "MAYBE" && s !== "NO";
        case "need_text":
          return s === "READY" || s === "NO_PHONE";
        case "waiting":
          return s === "OPENED" || s === "TEXTED";
        case "no_phone":
          return s === "NO_PHONE";
        default:
          return true;
      }
    });
  }, [invitees, filter]);

  const rollComing = useMemo(
    () => invitees.filter((i) => inviteeStatus(i) === "YES"),
    [invitees]
  );
  const rollMaybe = useMemo(
    () => invitees.filter((i) => inviteeStatus(i) === "MAYBE"),
    [invitees]
  );
  const rollCant = useMemo(
    () => invitees.filter((i) => inviteeStatus(i) === "NO"),
    [invitees]
  );
  const rollNoReply = useMemo(
    () =>
      invitees.filter((i) => {
        const s = inviteeStatus(i);
        return s !== "YES" && s !== "MAYBE" && s !== "NO";
      }),
    [invitees]
  );

  function linkFor(inv: RosterInvitee) {
    return personalRsvpUrl(base, slug, inv.token);
  }

  function messageFor(inv: RosterInvitee) {
    return fillRsvpMessageTemplate(template, {
      firstName: inv.firstName,
      lastName: inv.lastName,
      displayName: inv.displayName,
      eventTitle: title,
      when,
      location,
      link: linkFor(inv),
    });
  }

  const previewPerson =
    invitees[0] ??
    ({
      firstName: "Sarah",
      lastName: "Jones",
      displayName: "Sarah Jones",
      phone: null,
      token: "preview",
      id: "preview",
      textedAt: null,
      textedById: null,
      textedByName: null,
      firstOpenedAt: null,
      lastOpenedAt: null,
      openCount: 0,
      addedById: null,
      addedByName: null,
      response: null,
    } satisfies RosterInvitee);

  async function saveTemplate() {
    setTemplateBusy(true);
    setTemplateMsg(null);
    setErr(null);
    try {
      const res = await fetch(`/api/app/rsvps/${rsvpId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageTemplate: template }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Could not save message");
        return;
      }
      setTemplateDirty(false);
      setTemplateMsg("Message saved");
      setTimeout(() => setTemplateMsg(null), 2000);
      router.refresh();
    } catch {
      setErr("Network error saving message");
    } finally {
      setTemplateBusy(false);
    }
  }

  async function addPerson(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAddBusy(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/app/rsvps/${rsvpId}/invitees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Could not add person");
        return;
      }
      setInvitees((list) =>
        [...list, data.invitee as RosterInvitee].sort((a, b) =>
          a.displayName.localeCompare(b.displayName)
        )
      );
      setName("");
      setPhone("");
      router.refresh();
    } catch {
      setAddError("Network error");
    } finally {
      setAddBusy(false);
    }
  }

  async function setTexted(inv: RosterInvitee, texted: boolean) {
    try {
      const res = await fetch(
        `/api/app/rsvps/${rsvpId}/invitees/${inv.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markTexted: texted }),
        }
      );
      const data = await res.json();
      if (!res.ok) return;
      setInvitees((list) =>
        list.map((x) => (x.id === inv.id ? (data.invitee as RosterInvitee) : x))
      );
    } catch {
      /* ignore — sms still opened */
    }
  }

  async function markTexted(inv: RosterInvitee) {
    await setTexted(inv, true);
  }

  async function markNotSent(inv: RosterInvitee) {
    await setTexted(inv, false);
  }

  async function removePerson(inv: RosterInvitee) {
    if (!confirm(`Remove ${inv.displayName} from this list?`)) return;
    try {
      const res = await fetch(
        `/api/app/rsvps/${rsvpId}/invitees/${inv.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) return;
      setInvitees((list) => list.filter((x) => x.id !== inv.id));
      router.refresh();
    } catch {
      setErr("Could not remove person");
    }
  }

  async function copyLink(inv: RosterInvitee) {
    try {
      await navigator.clipboard.writeText(linkFor(inv));
      setCopiedId(inv.id);
      setTimeout(() => setCopiedId((c) => (c === inv.id ? null : c)), 2000);
    } catch {
      /* ignore */
    }
  }

  async function importPcoList() {
    if (!pcoListId) return;
    setImportBusy(true);
    setImportMsg(null);
    setErr(null);
    try {
      const selected = pcoLists?.find((l) => l.id === pcoListId);
      const res = await fetch(`/api/app/rsvps/${rsvpId}/invitees/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listId: pcoListId,
          listName: selected?.name ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Import failed");
        return;
      }
      setInvitees(data.invitees as RosterInvitee[]);
      const parts = [
        data.added ? `${data.added} added` : null,
        data.updated ? `${data.updated} updated` : null,
      ].filter(Boolean);
      setImportMsg(
        parts.length
          ? `Imported “${data.listName || "list"}”: ${parts.join(", ")}.`
          : data.imported === 0
            ? "That list has no people yet."
            : "List already up to date."
      );
      router.refresh();
    } catch {
      setErr("Network error importing list");
    } finally {
      setImportBusy(false);
    }
  }

  const input =
    "w-full rounded-xl border border-line bg-card-muted px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle";

  const filters: { key: FilterKey; label: string; n?: number }[] = [
    { key: "all", label: "All", n: counts.total },
    { key: "coming", label: "Coming", n: counts.coming },
    { key: "maybe", label: "Maybe", n: counts.maybe },
    { key: "cant", label: "Can't", n: counts.cant },
    { key: "no_reply", label: "No reply", n: counts.noReply },
    { key: "waiting", label: "Waiting", n: counts.waiting },
    { key: "need_text", label: "Need text", n: counts.needText + counts.noPhone },
  ];

  return (
    <div className="space-y-5">
      {/* Funnel summary */}
      <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink">Personal text list</h2>
            <p className="mt-1 text-xs text-ink-muted">
              Import a Planning Center list (or add people by hand). Each person
              gets a unique link — tap <strong>Text</strong> to open Messages
              with their number and message filled in.
            </p>
            {currentUserName && (
              <p className="mt-1.5 text-xs text-ink-subtle">
                Working as{" "}
                <span className="font-semibold text-ink">{currentUserName}</span>
                {" — "}
                texts and list adds are tagged with your name.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setListsTourOpen(true)}
            className="shrink-0 rounded-lg border border-brand/30 bg-brand-soft px-2.5 py-1.5 text-xs font-semibold text-brand-text transition hover:border-brand/50"
          >
            How to use lists
          </button>
        </div>
        {invitees.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="On list" value={counts.total} />
            <Stat label="Coming" value={counts.comingHeads} accent />
            <Stat label="Replied" value={counts.replied} />
            <Stat label="No reply" value={counts.noReply} />
          </div>
        )}
      </div>

      {/* Attendance roll — names by response */}
      {invitees.length > 0 && (
        <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Attendance roll</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Tap a name group filter below, or scan the lists. Party size is
            included for Coming / Maybe.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <RollColumn
              title="Coming"
              count={counts.coming}
              heads={counts.comingHeads}
              accent
              empty="No one has said yes yet."
              people={rollComing}
              onFilter={() => setFilter("coming")}
            />
            <RollColumn
              title="Maybe"
              count={counts.maybe}
              heads={counts.maybeHeads}
              empty="No maybes."
              people={rollMaybe}
              onFilter={() => setFilter("maybe")}
            />
            <RollColumn
              title="Can't"
              count={counts.cant}
              empty="No one has said they can't."
              people={rollCant}
              onFilter={() => setFilter("cant")}
            />
            <RollColumn
              title="No reply yet"
              count={counts.noReply}
              empty="Everyone has replied."
              people={rollNoReply}
              onFilter={() => setFilter("no_reply")}
              subtitleFor={(inv) => {
                const s = inviteeStatus(inv);
                if (s === "OPENED") return "Opened · no answer";
                if (s === "TEXTED")
                  return inv.textedByName
                    ? `Texted by ${inv.textedByName}`
                    : "Texted · no open";
                if (s === "NO_PHONE") return "No phone";
                return "Not texted yet";
              }}
            />
          </div>
        </div>
      )}

      <ListsTour
        open={listsTourOpen}
        onClose={() => setListsTourOpen(false)}
        autoOffer
      />

      {/* Planning Center list import */}
      {!closed && pcoConfigured && (
        <div className="rounded-2xl border border-brand/30 bg-brand-soft p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">
            Import from Planning Center
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Choose a People list. We load names + mobile numbers and create a
            personal RSVP link for each person. Re-import updates names/phones
            without wiping who you already texted or who replied.
          </p>
          {pcoLists === null ? (
            <p className="mt-3 text-xs text-ink-subtle">Loading lists…</p>
          ) : pcoListsError ? (
            <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
              {pcoListsError}
            </p>
          ) : pcoLists.length === 0 ? (
            <p className="mt-3 text-xs text-ink-muted">
              No People lists found. Create a list in Planning Center People,
              then refresh this page.
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                className={input}
                value={pcoListId}
                onChange={(e) => setPcoListId(e.target.value)}
                disabled={importBusy}
              >
                <option value="">Select a list…</option>
                {pcoLists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                    {typeof l.totalPeople === "number"
                      ? ` (${l.totalPeople})`
                      : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!pcoListId || importBusy}
                onClick={() => void importPcoList()}
                className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-contrast transition hover:bg-brand-strong disabled:opacity-50"
              >
                {importBusy ? "Importing…" : "Import list"}
              </button>
            </div>
          )}
          {importMsg && (
            <p className="mt-2 text-xs font-medium text-accent">{importMsg}</p>
          )}
        </div>
      )}

      {!closed && !pcoConfigured && (
        <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">
            Planning Center lists
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Connect Planning Center (PCO_APP_ID + PCO_SECRET with People access)
            to import a list here. You can still add people manually below.
          </p>
        </div>
      )}

      {/* Message template */}
      <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Text message</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Tokens:{" "}
          <code className="text-[11px]">%first%</code>{" "}
          <code className="text-[11px]">%last%</code>{" "}
          <code className="text-[11px]">%name%</code>{" "}
          <code className="text-[11px]">%event%</code>{" "}
          <code className="text-[11px]">%when%</code>{" "}
          <code className="text-[11px]">%where%</code>{" "}
          <code className="text-[11px]">%link%</code>
        </p>
        <textarea
          className={`${input} mt-2 min-h-[120px] font-sans leading-relaxed`}
          value={template}
          onChange={(e) => {
            setTemplate(e.target.value);
            setTemplateDirty(true);
          }}
          disabled={closed}
        />
        <p className="mt-2 rounded-lg bg-card-muted px-3 py-2 text-xs text-ink-muted ring-1 ring-line">
          <span className="font-semibold text-ink-subtle">Preview · </span>
          {fillRsvpMessageTemplate(template, {
            firstName: previewPerson.firstName,
            lastName: previewPerson.lastName,
            displayName: previewPerson.displayName,
            eventTitle: title,
            when,
            location,
            link: personalRsvpUrl(base, slug, previewPerson.token),
          })}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={closed || templateBusy || !templateDirty}
            onClick={() => void saveTemplate()}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-contrast transition hover:bg-brand-strong disabled:opacity-50"
          >
            {templateBusy ? "Saving…" : "Save message"}
          </button>
          {templateMsg && (
            <span className="text-xs font-medium text-accent">{templateMsg}</span>
          )}
        </div>
      </div>

      {/* Add person */}
      {!closed && (
        <form
          onSubmit={(e) => void addPerson(e)}
          className="rounded-2xl border border-line bg-card p-4 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-ink">Add a person</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input
              className={input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              required
              autoComplete="name"
            />
            <input
              className={input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Mobile (optional)"
              inputMode="tel"
              autoComplete="tel"
            />
          </div>
          {addError && (
            <p className="mt-2 text-xs text-danger">{addError}</p>
          )}
          <button
            type="submit"
            disabled={addBusy || !name.trim()}
            className="mt-3 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-card-muted disabled:opacity-50"
          >
            {addBusy ? "Adding…" : "+ Add to list"}
          </button>
        </form>
      )}

      {err && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {err}
        </p>
      )}

      {/* Filters + cards */}
      {invitees.length > 0 && (
        <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
          <div className="flex flex-wrap gap-1.5">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                  filter === f.key
                    ? "bg-brand text-brand-contrast"
                    : "bg-card-muted text-ink-muted ring-1 ring-line hover:bg-card"
                }`}
              >
                {f.label}
                {typeof f.n === "number" ? ` (${f.n})` : ""}
              </button>
            ))}
          </div>

          <ul className="mt-3 divide-y divide-line">
            {filtered.length === 0 ? (
              <li className="py-4 text-center text-sm text-ink-subtle">
                No one in this filter.
              </li>
            ) : (
              filtered.map((inv) => {
                const status = inviteeStatus(inv);
                const msg = messageFor(inv);
                const hasPhone = Boolean(normalizePhoneForSms(inv.phone));
                return (
                  <li key={inv.id} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {inv.displayName}
                          {inv.response && inv.response.count > 1 && (
                            <span className="ml-1.5 text-xs font-normal text-ink-subtle">
                              ×{inv.response.count}
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-ink-subtle">
                          {inv.phone || "No phone on file"}
                          {inv.firstOpenedAt
                            ? ` · opened ${formatRelativeTime(inv.firstOpenedAt)}`
                            : inv.textedAt
                              ? ` · texted ${formatRelativeTime(inv.textedAt)}`
                              : ""}
                          {inv.textedByName
                            ? ` · by ${inv.textedByName}`
                            : ""}
                          {inv.addedByName
                            ? ` · added by ${inv.addedByName}`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_PILL[status]}`}
                      >
                        {inviteeStatusLabel(status)}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {hasPhone && !closed && (
                        <a
                          href={smsHref(inv.phone, msg)}
                          onClick={() => void markTexted(inv)}
                          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-contrast transition hover:bg-accent-strong"
                        >
                          {inv.textedAt ? "Text again" : "Text"}
                        </a>
                      )}
                      {!hasPhone && (
                        <button
                          type="button"
                          onClick={() => void copyLink(inv)}
                          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-contrast transition hover:bg-accent-strong"
                        >
                          {copiedId === inv.id ? "Copied!" : "Copy link"}
                        </button>
                      )}
                      {hasPhone && (
                        <button
                          type="button"
                          onClick={() => void copyLink(inv)}
                          className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-card-muted"
                        >
                          {copiedId === inv.id ? "Copied!" : "Copy link"}
                        </button>
                      )}
                      {!inv.textedAt && !closed && (
                        <button
                          type="button"
                          onClick={() => void markTexted(inv)}
                          className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-card-muted"
                        >
                          Mark texted
                        </button>
                      )}
                      {inv.textedAt && !closed && (
                        <button
                          type="button"
                          onClick={() => void markNotSent(inv)}
                          title="Clear texted status if you didn’t actually send"
                          className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-card-muted hover:text-ink"
                        >
                          Not sent
                        </button>
                      )}
                      {!closed && (
                        <button
                          type="button"
                          onClick={() => void removePerson(inv)}
                          className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-subtle transition hover:bg-card-muted hover:text-danger"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-card-muted px-3 py-2 text-center">
      <p
        className={`text-xl font-bold ${accent ? "text-accent" : "text-ink"}`}
      >
        {value}
      </p>
      <p className="text-[10px] font-medium uppercase tracking-wide text-ink-subtle">
        {label}
      </p>
    </div>
  );
}

function RollColumn({
  title,
  count,
  heads,
  accent,
  empty,
  people,
  onFilter,
  subtitleFor,
}: {
  title: string;
  count: number;
  heads?: number;
  accent?: boolean;
  empty: string;
  people: RosterInvitee[];
  onFilter: () => void;
  subtitleFor?: (inv: RosterInvitee) => string;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        accent ? "border-accent/40 bg-accent-soft/40" : "border-line bg-card-muted"
      }`}
    >
      <button
        type="button"
        onClick={onFilter}
        className="flex w-full items-baseline justify-between gap-2 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
          {title}
        </span>
        <span
          className={`text-sm font-bold ${accent ? "text-accent" : "text-ink"}`}
        >
          {count}
          {typeof heads === "number" && heads !== count
            ? ` · ${heads} people`
            : ""}
        </span>
      </button>
      {people.length === 0 ? (
        <p className="mt-2 text-xs text-ink-subtle">{empty}</p>
      ) : (
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
          {people.map((p) => (
            <li key={p.id} className="text-sm text-ink">
              <span className="font-medium">{p.displayName}</span>
              {p.response && p.response.count > 1 && (
                <span className="text-xs text-ink-subtle"> ×{p.response.count}</span>
              )}
              {subtitleFor && (
                <span className="block text-[11px] text-ink-subtle">
                  {subtitleFor(p)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
