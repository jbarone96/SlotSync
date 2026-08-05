# SlotSync

A scoped-down booking system: a host sets weekly availability, a booker picks
an open slot from a public page, pays a small confirmation fee via Stripe,
and the booking is locked in — safely, even if two people try to grab the
same slot at the same time.

**Live demo:** _add your deployed URL here_
**Booking page:** `/book/jordan` (after seeding — see below)

![screenshot placeholder](docs/screenshot.png)

## Why I built this

Most portfolio CRUD apps don't have a real technical problem hiding inside
them. This one does, twice: preventing double-booked slots under concurrent
requests, and making Stripe payment confirmation trustworthy instead of
spoofable. Those two problems — and how I solved them — are the actual point
of this project.

## Stack

- **Frontend:** React + TypeScript, React Router, Vite
- **Backend:** Node + Express + TypeScript, Prisma ORM
- **Database:** PostgreSQL
- **Payments:** Stripe (Checkout Sessions + webhooks)
- **Testing:** Vitest (unit tests on the core scheduling logic)
- **CI:** GitHub Actions (typecheck, build, test on every push)

## Design

Booking cards and the slot picker use a "ticket stub" visual language —
a perforated edge and rubber-stamp status badges — to reinforce the idea
of reserving a slot, not just filling out a form. Built around IBM Plex
Sans/Mono and a brass/ink/teal color system.

## Architecture decisions

### Double-booking is prevented at the database layer, not in application code

The tempting approach is: query for existing bookings at this time, and if
none exist, insert. That's wrong under concurrency — two requests can both
pass the "is this slot free?" check before either one finishes inserting
(a classic check-then-act race condition). This app puts a **unique
constraint on `(hostId, startTime)`** in the database
(`backend/prisma/schema.prisma`). Whichever booking insert loses the race
gets a Postgres unique-violation error, which the API catches and turns into
a normal "that slot was just taken" response
(`backend/src/routes/bookings.ts`). The database — not the application — is
the single source of truth for slot availability.

### Stripe webhooks confirm payment, not the client-side redirect

It's tempting to mark a booking "confirmed" as soon as the browser hits the
`success_url` after Stripe Checkout. That's insecure: a browser redirect can
be spoofed, skipped, or interrupted by a closed tab, none of which mean the
payment actually went through. Instead, bookings are created as `PENDING`
and only flipped to `CONFIRMED` when Stripe's signed webhook
(`checkout.session.completed`) hits the server
(`backend/src/routes/stripeWebhook.ts`). The client redirect is only ever
used for UX (showing a success screen) — it never changes state on its own.

### Availability is computed on-demand, not pre-materialized

Slots aren't stored as rows; they're computed from the host's weekly
availability JSON at request time (`backend/src/availability.ts`). For an
MVP's read volume this is simpler and avoids a stale-data problem — a
materialized "slots" table would need invalidation logic every time a host
edited their hours. If this needed to scale to heavy read traffic, the next
step would be caching computed slots per host/day in Redis with a short TTL,
invalidated on availability edits.

### The core scheduling math is a pure, tested function

`generateSlotsForWindow` in `availability.ts` takes a day and a working
window and returns candidate slot times — no database, no "now," no
booking state. That separation is what makes it possible to unit test the
actual scheduling math (`src/__tests__/availability.test.ts`) without
spinning up a database in CI.

## What's intentionally out of scope

- Calendar sync (Google Calendar, etc.)
- Multiple event types per host
- Timezone conversion UI — the demo host is hardcoded to one timezone;
  a real version would store everything in UTC and convert per-viewer
  with `date-fns-tz`
- Rescheduling (only cancel is supported)

These are left out on purpose to keep the MVP focused on the two problems
above, not because they're technically hard to add.

## Running locally

### Prerequisites
- Node 20+
- PostgreSQL running locally (or a hosted instance)
- A Stripe account in test mode

### Backend

```bash
cd backend
cp .env.example .env    # fill in DATABASE_URL, JWT_SECRET, Stripe keys
npm install
npx prisma migrate dev --name init
npm run seed             # creates a demo host: jordan@example.com / demo1234
npm run dev               # http://localhost:4000
```

To receive Stripe webhooks locally, use the Stripe CLI:
```bash
stripe listen --forward-to localhost:4000/api/stripe/webhook
```
Copy the webhook signing secret it prints into `STRIPE_WEBHOOK_SECRET` in `.env`.

### Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

Visit `http://localhost:5173/book/jordan` to try the booking flow, or
`http://localhost:5173/login` to view the host dashboard.

### Tests

```bash
cd backend
npm test
```

## Deployment notes

- **Frontend:** deploy `frontend/` to Vercel or Netlify; set `VITE_API_URL`
  to your deployed backend URL.
- **Backend:** deploy `backend/` to Railway or Render; set all `.env`
  variables in the platform's environment config, and point Stripe's
  webhook endpoint (in the Stripe dashboard) at
  `https://your-api-domain/api/stripe/webhook`.
- **Database:** Railway/Render/Supabase all offer managed Postgres —
  point `DATABASE_URL` at it and run `npx prisma migrate deploy`.
