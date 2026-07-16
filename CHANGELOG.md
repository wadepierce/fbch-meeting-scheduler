# Changelog

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
