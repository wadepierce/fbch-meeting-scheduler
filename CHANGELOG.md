# Changelog

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
