# FBCH Meeting Scheduler

Phone-friendly when2meet-style availability polls for **First Baptist Church Henrietta**.

- Organizers sign in with a **passkey** (Face ID / fingerprint / device PIN) — no passwords
- Invite people by **email or a copy-able link**; opening the link signs them in automatically and prompts them to create a passkey
- Sign in on a desktop using the passkey on your phone (scan the on-screen code)
- Create a poll → share `/m/{slug}`
- Participants enter **name** and paint free times
- Lock a time → everyone **downloads .ics** for iPhone/Android calendar
- **Dark & light** themes with strong contrast (follows the system, with a manual toggle)

Planned domain: `meetings.fbchenrietta.org`
Railway project: **Wade's Custom Apps**

## How sign-in works

Authentication is passwordless, built on **WebAuthn / passkeys**:

1. **Invite** — an admin adds someone on the **Team** page and shares the personal link (copy or email).
2. **Auto sign-in** — opening the link creates the person's organizer account and signs them in.
3. **Create a passkey** — they're prompted to save a passkey to the device (phone or laptop).
4. **Return visits** — "Sign in with a passkey" uses that credential. Passkeys saved to an
   Apple/Google account sync across that person's devices; on any other computer they can pick
   "use a passkey from a nearby device" and scan the code with their phone.

A legacy **email + passcode** path remains (behind "Use email & passcode instead") so the
bootstrap admin can get in the first time and set up a passkey.

## Local dev

```bash
# Postgres + secrets in your environment (see "Environment" below)
npm install
npx prisma db push
npm run dev
```

Open http://localhost:3000 → **Organizer sign in**. Use the bootstrap email/passcode once,
then add a passkey from the **Passkeys** page.

## Environment

`.env*` is gitignored. Set these (locally in `.env`, in production via Railway):

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `SESSION_SECRET` | yes | ≥16 chars; signs the session + WebAuthn challenge cookies |
| `BOOTSTRAP_ADMIN_EMAIL` | first deploy | Seeds the first admin when the DB is empty |
| `BOOTSTRAP_ADMIN_PASSCODE` | first deploy | Passcode for that admin (used once, then switch to a passkey) |
| `BOOTSTRAP_ADMIN_NAME` | optional | Defaults to `Admin` |
| `APP_URL` | recommended | Absolute origin used for invite links (e.g. `https://meetings.fbchenrietta.org`). Falls back to the request host. |
| `RP_ID` | optional | WebAuthn Relying Party ID. Defaults to the request hostname; set it (e.g. `fbchenrietta.org`) only if passkeys must work across multiple subdomains. |
| `SMTP_HOST` `SMTP_USER` `SMTP_PASS` | optional | Enables emailing invites. Set all three to turn it on. |
| `SMTP_PORT` | optional | Defaults to `587` (`465` = implicit TLS). |
| `SMTP_SECURE` | optional | `true` to force TLS (usually only for port 465). |
| `EMAIL_FROM` | optional | From address, e.g. `FBCH Scheduler <meetings@fbchenrietta.org>`. Defaults to `SMTP_USER`. |

## Sending invite emails (free)

Emailing invites is **optional** — without it, organizers just copy the invite link
(or use the "Email invite" button, which opens their own mail app). To have the app
send the emails itself, point the `SMTP_*` vars at any free provider:

- **[Brevo](https://www.brevo.com)** — recommended for the least setup. 300 emails/day
  free, and you only verify **one sender address** (no DNS changes needed). Use
  `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`, and the SMTP login/key they give you.
- **[Resend](https://resend.com)** — 3,000/month free; to email anyone you verify the
  `fbchenrietta.org` domain (a few DNS records), which also gives you a polished
  `meetings@fbchenrietta.org` from-address. SMTP host `smtp.resend.com`.
- Any other SMTP provider (SendGrid, Mailgun, Gmail app password…) works too.

Set `EMAIL_FROM` to a verified sender. When configured, creating an invite emails it
automatically and the Team page shows a **Resend email** action.

## Railway

1. Service in **Wade's Custom Apps**
2. Attach Postgres (`DATABASE_URL`)
3. Set env vars from the table above
4. Deploy (Nixpacks). Healthcheck: `/api/health`
5. Custom domain DNS → Railway. Make sure `APP_URL` matches the final domain so passkeys
   register against the right origin.

## Stack

Next.js 16 · Prisma 6 · PostgreSQL · Tailwind 4 · JWT cookie sessions · WebAuthn passkeys
([@simplewebauthn](https://simplewebauthn.dev))
