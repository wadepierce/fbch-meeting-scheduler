# Changelog

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
