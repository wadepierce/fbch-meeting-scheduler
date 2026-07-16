# FBCH Meeting Scheduler

Phone-friendly when2meet-style availability polls for **First Baptist Church Henrietta**.

- Organizers sign in with **email + passcode** (invite-only)
- Create a poll → share `/m/{slug}`
- Participants enter **name** and paint free times
- Lock a time → everyone **downloads .ics** for iPhone/Android calendar

Planned domain: `meetings.fbchenrietta.org`  
Railway project: **Wade's Custom Apps**

## Local dev

```bash
cp .env.example .env
# set DATABASE_URL, SESSION_SECRET, BOOTSTRAP_ADMIN_*
npm install
npx prisma db push
npm run dev
```

Open http://localhost:3000 → **Organizer sign in** with bootstrap email/passcode.

## Railway

1. Service in **Wade's Custom Apps**
2. Attach Postgres (`DATABASE_URL`)
3. Set env vars from `.env.example`
4. Deploy (Nixpacks). Healthcheck: `/api/health`
5. Custom domain DNS → Railway

## Stack

Next.js 16 · Prisma 6 · PostgreSQL · Tailwind 4 · JWT cookie sessions
