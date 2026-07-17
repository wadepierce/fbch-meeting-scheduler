# FBCH Meeting Scheduler

Phone-friendly when2meet-style availability polls for **First Baptist Church Henrietta**.

- Organizers sign in with a **passkey** (Face ID / fingerprint / device PIN) — no passwords
- Invite people by **email or a copy-able link**; opening the link signs them in automatically and prompts them to create a passkey
- Sign in on a desktop using the passkey on your phone (scan the on-screen code)
- Create a poll → share `/m/{slug}`
- Participants enter **name** and paint free times
- Lock a time → everyone **downloads .ics** for iPhone/Android calendar
- **Dark & light** themes with strong contrast (follows the system, with a manual toggle)
- Admins see **last sign-in** per team member; organizers see **view counts** on shared poll / meeting / headcount links

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
| `APP_URL` | recommended | Absolute origin for invite/RSVP links. Use the URL people actually open (today: `https://fbch-meeting-scheduler-production.up.railway.app`). Falls back to the request host. |
| `RP_ID` | optional | WebAuthn Relying Party ID. Defaults to the **request** hostname. Only set a parent domain (e.g. `fbchenrietta.org`) if every access host is under it — never set a custom domain RP ID while people use the Railway `*.up.railway.app` host. |
| `SMTP_HOST` `SMTP_USER` `SMTP_PASS` | optional | Enables emailing invites. Set all three to turn it on. |
| `SMTP_PORT` | optional | Defaults to `587` (`465` = implicit TLS). |
| `SMTP_SECURE` | optional | `true` to force TLS (usually only for port 465). |
| `EMAIL_FROM` | optional | From address, e.g. `FBCH Scheduler <meetings@fbchenrietta.org>`. Defaults to `SMTP_USER`. |
| `PCO_APP_ID` `PCO_SECRET` | optional | Planning Center Personal Access Token — enables the Events page pulling from the church calendar. |

## Sending invite emails (free, via Resend)

Emailing invites is **optional** — without it, organizers just copy the invite link
(or use the "Email invite" button, which opens their own mail app). The app sends
email over plain SMTP; **[Resend](https://resend.com)** is the recommended provider
(3,000 emails/month free) and gives you a polished `meetings@fbchenrietta.org`
from-address:

1. Create a Resend account → **Domains** → add `fbchenrietta.org` and create the
   DNS records it shows (SPF + DKIM) wherever the domain's DNS is hosted. Wait for
   the domain to show **Verified**.
2. **API Keys** → create a key (starts with `re_`).
3. Set the env vars:
   - `SMTP_HOST=smtp.resend.com`
   - `SMTP_PORT=465`
   - `SMTP_USER=resend` (literally the word "resend")
   - `SMTP_PASS=re_...` (the API key)
   - `EMAIL_FROM=FBCH Scheduler <meetings@fbchenrietta.org>` (any address on the
     verified domain works)

Any other SMTP provider (Brevo, SendGrid, Mailgun, Gmail app password…) works with
the same variables — Brevo is handy if you'd rather not touch DNS, since it only
verifies a single sender address.

When configured, creating an invite emails it automatically and the Team page shows
a **Resend email** action.

The same SMTP settings power **personal notifications**: each organizer gets an email
when someone responds to their meeting polls or RSVPs to their headcounts, and can
turn either off on the **Account** page (`/app/security`). Notifications only fire on
new responses (not edits).

## Planning Center events & text-out headcounts

The **Events** page pulls upcoming events from the Planning Center calendar so you can
search, filter by date, sort, and — for any event — spin up a **headcount page** in one
tap. "Text it" opens your Messages app with a prefilled invitation + link; people tap
the link, answer *I'll be there / Maybe / Can't*, and say how many they're bringing.
The organizer page totals it live ("Plan for 23, up to 27 with maybes"). Texted links
show a branded preview card automatically.

To connect Planning Center (free):

1. Sign in at `https://api.planningcenteronline.com/oauth/applications`
2. Create a **Personal Access Token**
3. Set `PCO_APP_ID` and `PCO_SECRET` in Railway

No token? Headcounts can still be created manually on the Events page.

## Railway

1. Service in **Wade's Custom Apps**
2. Attach Postgres (`DATABASE_URL`)
3. Set env vars from the table above
4. Deploy (Nixpacks). Healthcheck: `/api/health`
5. Set `APP_URL` to the public origin people open (Railway default host until the
   custom domain is live). Passkeys bind to the host in the address bar — open the
   app only via that same origin when registering or signing in.

## Stack

Next.js 16 · Prisma 6 · PostgreSQL · Tailwind 4 · JWT cookie sessions · WebAuthn passkeys
([@simplewebauthn](https://simplewebauthn.dev))
