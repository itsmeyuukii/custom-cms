# Running the Seed Script

What `prisma/seed.ts` does, how to run it against your local database
(routine) and against production/any remote database (occasional, needs
care), and what it does and doesn't do on repeat runs.

## What it creates

- Three users, one per role: `admin@example.com`, `editor@example.com`,
  `viewer@example.com` — all sharing one password (see below).
- Two example page Components: `hero`, `card-grid` (with their JSON
  Schema, matching `src/components/blocks/registry.tsx`).

## The password: `SEED_USER_PASSWORD`

The script reads `SEED_USER_PASSWORD` from the environment. If it's not
set, it falls back to `changeme123` and prints a warning — fine for
local dev, **never acceptable for a shared or production database.**

Generate a real one before seeding anything that isn't purely local:

```powershell
$rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
$bytes = New-Object byte[] 18
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

## Running it locally

Your local `.env` already has `DATABASE_URL` (pointing at your local
Postgres) and, optionally, `SEED_USER_PASSWORD`. Just:

```
npm run db:seed
```

## Running it against a remote database (staging/production)

**Never edit `.env` to point it at a remote database** — it's too easy
to forget to change it back and end up accidentally running local dev
against production. Instead, override `DATABASE_URL` for one single
command, in the same terminal session, then clear it immediately:

**PowerShell:**

```powershell
$env:DATABASE_URL = "postgresql://...the real remote connection string..."
npm run db:seed
Remove-Item Env:\DATABASE_URL
```

**Bash:**

```bash
DATABASE_URL="postgresql://...the real remote connection string..." npm run db:seed
```

(The Bash form is naturally scoped to just that one command — no
separate cleanup step needed.)

This works because `dotenv` (loaded via `import "dotenv/config"` at the
top of `seed.ts`) never overrides a variable that's already set in the
environment — so a `DATABASE_URL` you set in the shell always wins over
whatever's in `.env`, for exactly the lifetime of that shell session.

`SEED_USER_PASSWORD` doesn't need to be overridden the same way — it's
fine for it to keep coming from your local `.env` as normal, as long as
you've actually set it to a real value there (not left it unset/using
the `changeme123` fallback) before seeding anything remote.

### Where to get a remote `DATABASE_URL`

For this project's production database: **Vercel dashboard → Settings →
Environment Variables → `DATABASE_URL`.** Some integration-managed
variables can't be revealed/copied directly from Vercel's UI (see
`PROJECT_PLAN.md` §7's Vercel gotchas) — if that happens, check the
database provider's own dashboard instead (e.g. Prisma Postgres's
resource page has a "Quickstart" panel with real, copyable connection
strings).

## What happens if you run it again

**Nothing, for anything that already exists.** Every write in
`seed.ts` is a Prisma `upsert` with an empty `update: {}` — meaning if
a row already exists (matched by email for users, by `key` for
Components), it is left completely untouched. Only genuinely new rows
get created.

**Practical implications:**

- Safe to re-run any time — it will never duplicate or corrupt existing
  data.
- **It will _not_ let you reset a seeded user's password** by changing
  `SEED_USER_PASSWORD` and re-running — the existing user's
  `passwordHash` is never touched once created. There's no self-service
  password reset built yet; changing a seeded user's password today
  requires either deleting that user first (so the next seed run
  re-creates them with the new password) or writing a small one-off
  script to update `passwordHash` directly.
- If you add a new Component or a new seeded user to `seed.ts` later,
  running it again against an already-seeded database only creates the
  _new_ additions — existing ones are skipped, as above.

## Verifying it worked

Don't just trust the console output — confirm against the actual
running app. For a remote deploy, the most direct check is a real login
attempt against the live site (see `docs/PROJECT_PLAN.md`'s deployment
notes for exactly how this was verified the first time, via a curl-based
login + session check).
