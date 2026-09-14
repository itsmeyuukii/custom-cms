# Custom CMS — Project Plan & Status

Tracking file for this project. Update this as work progresses so it's always
clear what's done, what's in progress, and what's next.

GitHub repo: https://github.com/itsmeyuukii/custom-cms
(pushed to `main`, history split into small logical commits — run
`git log --oneline` to see them)

---

## 1. Decisions made

| Decision | Choice | Why |
|---|---|---|
| Framework | Next.js (TypeScript, App Router, Tailwind) | One full-stack app — frontend + backend in one codebase |
| Database | PostgreSQL | Relational, good fit for structured content (pages, posts, users) |
| ORM | Prisma | Type-safe database access, generates a client from `prisma/schema.prisma` |
| Auth | NextAuth v5 (Credentials provider: email + password) | Login + roles (Admin / Editor / Viewer) |
| Content model | Pages & Posts, made of reusable "Components" placed as "Blocks" | So a Page is built by picking components (Hero, Card Grid, etc.) and filling in their content — this is the "components to use in pages" requirement |

## 2. Packages installed (and what each is for)

| Package | Role |
|---|---|
| `next`, `react`, `react-dom` | The web framework itself |
| `tailwindcss` | Styling |
| `typescript`, `@types/*` | Type checking |
| `eslint`, `eslint-config-next` | Code linting |
| `prisma`, `@prisma/client` | Database ORM — defines the data model and talks to Postgres |
| `@prisma/adapter-pg`, `pg` | Prisma 7 requires a "driver adapter" to actually connect to Postgres (this is new in Prisma 7 vs older tutorials you may see online) |
| `dotenv` | Loads `.env` values for Prisma's config file |
| `next-auth` (v5 beta) | Login/session handling |
| `@auth/prisma-adapter` | Lets NextAuth store users/sessions in the Postgres database via Prisma |
| `bcryptjs` | Hashes passwords before storing them |
| `tsx` | Lets us run TypeScript seed scripts directly (`npm run db:seed`) |

Nothing else has been installed. No hosting, deployment, image upload, or
email-sending packages yet — those come later depending on priorities.

## 3. What's built so far

**Tested end-to-end and working.** A local Postgres database is connected,
migrated, and seeded. Verified by hand: logged in as the seeded admin,
created a page with a Hero block via Prisma, and confirmed it rendered
correctly at its public URL with real data from the database.

- `prisma/schema.prisma` — the data model:
  - `User` (with `role`: ADMIN / EDITOR / VIEWER)
  - `Page`, `Post` — content, with a `status` (DRAFT / PUBLISHED / ARCHIVED)
  - `Component` — a reusable block *definition* (e.g. "Hero", "Card Grid")
  - `Block` — one *instance* of a Component placed on a specific Page, with its own content
  - `Media` — uploaded file records (no upload UI yet, just the table)
- `src/lib/auth.ts` — NextAuth config (email/password login, JWT sessions, role attached to session)
- `src/lib/prisma.ts` — shared database client (Prisma 7 + the `@prisma/adapter-pg` driver adapter)
- `src/proxy.ts` — blocks `/admin/*` routes unless logged in (this is Next.js 16's renamed replacement for `middleware.ts` — using the old name/Edge runtime broke Prisma's `pg` driver, see commit history)
- `src/app/login` — a working login form
- `src/app/admin` — a minimal admin area:
  - `/admin` — dashboard showing who's logged in
  - `/admin/pages` — list pages, create a new one
  - `/admin/pages/[id]` — view a page, change its status, attach a Component to it as a Block (data entered as raw JSON for now — no visual form yet)
  - `/admin/posts`, `/admin/media` — read-only placeholder lists (no create/edit UI yet)
- `src/app/[slug]` — the **public** page: looks up a published Page by its URL slug and renders its Blocks
- `src/components/blocks/` — the actual reusable components:
  - `Hero.tsx`, `CardGrid.tsx` — two example components
  - `registry.tsx` — maps a Component's database `key` to the real React component
  - `BlockRenderer.tsx` — takes a Page's Blocks and renders each one via the registry
- `prisma/seed.ts` — creates one admin login (`admin@example.com` / `changeme123`) and registers the two example Components, so there's something to click on/edit
- `.env.example` — template of the environment variables needed (`DATABASE_URL`, `AUTH_SECRET`)
- `.env` — your actual local values (gitignored, never committed). Currently points at a local Postgres database called `custom_cms` running on this machine.
- `prisma/migrations/` — the migration that created all the tables, committed to git so anyone cloning the repo can run `prisma migrate deploy`/`dev` and get the same schema

## 4. What's NOT done yet

- Posts have no create/edit form (list only)
- Media has no upload flow (list only, no way to add a file)
- No public API endpoint (e.g. `/api/pages`) for a separate frontend to consume
- Block content is entered as raw JSON in the admin — no real visual editor
- No automated tests
- No CI/CD (explicitly deferred until the app itself is further along)

`npm run lint` and `npx tsc --noEmit` both pass clean as of this writing.

## 5. Immediate next steps (pick what you want first)

1. Decide what to build next: Post editor? Media upload? Public API? A real block-data editor instead of raw JSON?
2. Once more of the plan is done: set up CI (lint/type-check/build on push) and decide on deployment

## 6. Known gotchas (so you don't get stuck on these again)

- **Prisma 7 changed how the database URL is configured.** It's no longer in `schema.prisma` — it lives in `prisma.config.ts` and the actual Postgres connection happens through a "driver adapter" (`@prisma/adapter-pg`) passed into `PrismaClient`. Any online tutorial using `datasource db { url = env(...) }` is for an older Prisma version and won't work here.
- **Next.js 16 renamed `middleware.ts` to `proxy.ts`.** We hit this directly — the old `middleware.ts` runs in the Edge runtime, which can't load Prisma's Postgres driver, and every `/admin` request 500'd until we renamed the file.
- **The local Postgres password was reset once**, on 2026-09-14, to get a working connection (nobody on this project had the original password). New password lives only in `.env` (gitignored).

---
*This file is meant to be kept up to date — ask to have it revised as things change.*
