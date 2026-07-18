# Changelog

## Unreleased — Delete meetings

- **Delete a meeting** from its detail page: a Delete action (with a confirm)
  removes the availability meeting and all its painted responses, then returns
  to the meetings list — the public `/m/…` link stops working. Quick polls and
  headcounts already had a delete; meetings now match. Handy for clearing out
  test polls.

## Unreleased — Last sign-in + share-link view counts

- **Team page (admins):** each organizer shows **Last sign-in** (relative time,
  with absolute date/time on hover). Updated on passkey sign-in, email/passcode
  login, and opening an invite link.
- **View counts** on shared links for availability meetings (`/m/…`), quick
  polls (`/p/…`), and headcount RSVPs (`/r/…`). Shown on list + detail pages
  for organizers. Link-preview bots and common crawlers are excluded so the
  number reflects real opens.

## Unreleased — Fix passkey RP ID on Railway host

- Passkey sign-in failed with **The RP ID "meetings.fbchenrietta.org" is invalid
  for this domain** when the app was opened on the Railway default host
  (`*.up.railway.app`) while env still named the custom domain. WebAuthn requires
  the RP ID to be the browser's hostname (or a parent domain of it).
  `getRelyingParty()` now always derives the RP ID from the request host and only
  applies `RP_ID` when it is a valid domain suffix of that host — it no longer
  prefers `RAILWAY_PUBLIC_DOMAIN` / a mismatched custom domain. Canonical
  `APP_URL` for now: the Railway production origin (custom domain later).

## Unreleased — Fix broken invite links (internal redirect host)

- Opening a shared invite link redirected to Railway's internal address
  (`https://0.0.0.0:8080/…`) instead of the public site, so the recipient's
  browser couldn't reach it and the invite looked broken. The link itself was
  already minted from the clean public origin, but the `/invite/[token]`
  handler built its sign-in and error redirects from `req.url` — which carries
  the internal `host:port` behind the proxy. Those redirects now use
  `getBaseUrl()`, the same canonical origin the link was generated with
  (`APP_URL` → `RAILWAY_PUBLIC_DOMAIN` → port-stripped request host), so they
  land on the public domain. Completes the port-stripping fix below, which only
  covered link generation.

## Unreleased — Fix "restricted port" on shared links

- Shared links (invites, polls, RSVPs) could come out as `https://host:PORT/...`
  when the deploy sat behind a proxy that forwarded an internal port — which
  browsers reject with "Not allowed to use restricted port." `getBaseUrl()` now
  prefers `RAILWAY_PUBLIC_DOMAIN` and strips the port from any request-derived
  host (localhost keeps its port for dev). The same hardening is applied to the
  passkey Relying Party ID / expected origins.

## Unreleased — First-run welcome tour

- **Walkthrough tour** on first sign-in: a 6-step card overlay covering Meetings,
  Events, Headcounts, Polls, and Team/Account. Skip or finish and it never shows
  again (persisted per organizer via `Organizer.showTour`, not a browser cookie —
  so it stays dismissed across devices).
- **Re-enable on Account**: a "Welcome tour" toggle brings it back on the next
  app load.

## Unreleased — Quick question polls

- **Polls** tab: build short polls mixing five question types — multiple choice
  (with optional write-in "Other"), checkboxes, this-or-that, star ratings, and
  numeric scales with end labels. Options for anonymous answers and hiding
  results from voters.
- **Public voting page** (`/p/{slug}`): mobile-first tap-to-answer UI, share via
  Text it / copy with a branded link preview card.
- **One vote per device** via the guest cookie — the same cookie that prevents
  double voting also lets a voter change their answers later. Closing a poll
  locks it (new ballots rejected) while keeping results visible.
- **Live results**: percentage bars per option, write-in lists, star/scale
  averages with distribution histograms, and who answered (when names are on).

## Unreleased — Phone-first availability picker

- **Fixed pages rendering zoomed-out/tiny on phones**: the custom `viewport`
  export had replaced Next's default `width=device-width, initial-scale=1`
  meta tag, and the poll page's grid column could expand past the viewport
  (`min-width:auto`) — both fixed; every page now lays out at true device width.
- **Day-at-a-time picker on phones** for availability polls: swipeable day
  chips (with per-day count badges) + large tap-to-toggle time buttons, and a
  readable per-slot heatmap list with names in group view. The paint grid is
  unchanged on tablet/desktop widths.

## Unreleased — Self-service email notifications

- **Per-organizer notification settings** on the new **Account** page (with
  passkeys): each person toggles their own emails for *meeting poll responses*
  and *headcount replies*. Defaults on; takes effect when SMTP is configured.
- Notification emails fire on **new** responses only (not edits), after the
  response is sent (`after()`), so participants never wait on SMTP. Each email
  includes the running total and a "Manage notifications" link.

## Unreleased — Planning Center events & text-out headcounts

- **Events page** (`/app/events`): pulls upcoming events from the Planning Center
  calendar (Personal Access Token via `PCO_APP_ID`/`PCO_SECRET`), with text search,
  date-range filter, and sorting; manual headcount creation works without PCO.
- **Text-out headcounts**: one tap turns an event into a public RSVP page
  (`/r/{slug}`) and opens Messages with a prefilled text + link. People reply
  *I'll be there / Maybe / Can't* with a party size; totals show live on the
  organizer page. Responses are editable from the same device; headcounts can be
  closed/reopened/deleted. Texted links render a branded preview card (OG image).
- Schema: `Rsvp` + `RsvpResponse` models.

## Unreleased — Mobile polish, invite emails, print & share

- **Mobile header**: the organizer nav collapses into a hamburger menu on phones
  (fixes overflow ≤360px and makes Sign out reachable). Desktop is unchanged.
- **Send invite emails** over SMTP (any free provider — Brevo, Resend, SendGrid…).
  Creating an invite emails it automatically when configured, with a **Resend email**
  action; still falls back to copy-link / mailto when email isn't set up.
- **Printable meeting sheet** at `/app/{id}/print` — a branded, print-optimized page
  for a finalized meeting with a Print / Save-as-PDF button.
- **Shareable image** for social/texting: a branded 1200×630 PNG per meeting
  (`/m/{slug}/opengraph-image`), surfaced as a "Share image" button and used as the
  Open Graph / Twitter preview so shared poll links auto-render a card.

## 2026-07-16 — Passkeys, invites & theming

- **Passkey (WebAuthn) sign-in** for organizers — passwordless via Face ID / fingerprint / PIN
- **Usernameless login** so a phone passkey can sign you in on a desktop (scan-a-code / hybrid)
- **Invite by email or copy link** — opening the link auto-signs the person in and prompts them
  to create a passkey; admins manage invites and see organizers on the new **Team** page
- **Passkeys** management page — add/remove the devices you can sign in with
- **Dark & light themes** with strong contrast; follows the system with a manual toggle
- FBCH logo/branding across the app
- Email + passcode retained as a fallback (bootstrap admin, unsupported browsers)
- Schema: `Credential` and `Invite` models; `Organizer.passcodeHash` now optional

## 2026-07-16 — Initial release

- Organizer email + passcode auth with bootstrap admin
- Create availability polls (dates, hours, slot size)
- Public paint grid + heatmap at `/m/{slug}`
- Finalize meeting + ICS download for mobile calendars
- Railway healthcheck and Nixpacks deploy config
