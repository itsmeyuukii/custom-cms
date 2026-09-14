# Custom CMS — Project Plan & Status

Tracking file for this project. Update this as work progresses so it's always
clear what's done, what's in progress, and what's next.

GitHub repo: https://github.com/itsmeyuukii/custom-cms
(local git initialized, remote `origin` set, **nothing pushed yet**)

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

**Not yet tested end-to-end** — no real database has been connected yet, so
none of this has actually been run in a browser.

- `prisma/schema.prisma` — the data model:
  - `User` (with `role`: ADMIN / EDITOR / VIEWER)
  - `Page`, `Post` — content, with a `status` (DRAFT / PUBLISHED / ARCHIVED)
  - `Component` — a reusable block *definition* (e.g. "Hero", "Card Grid")
  - `Block` — one *instance* of a Component placed on a specific Page, with its own content
  - `Media` — uploaded file records (no upload UI yet, just the table)
- `src/lib/auth.ts` — NextAuth config (email/password login, JWT sessions, role attached to session)
- `src/lib/prisma.ts` — shared database client
- `src/middleware.ts` — blocks `/admin/*` routes unless logged in
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

## 4. What's NOT done yet

- No real Postgres database is connected (need a connection string — local Postgres, or a hosted one like Supabase/Railway/Neon)
- No migration has been run (`prisma migrate dev`) — the tables don't exist in any database yet
- Posts have no create/edit form (list only)
- Media has no upload flow (list only, no way to add a file)
- No public API endpoint (e.g. `/api/pages`) for a separate frontend to consume
- Block content is entered as raw JSON in the admin — no real visual editor
- Nothing has been committed to git or pushed to GitHub
- Lint/type-check was in progress when we paused (type-check passed; lint hadn't finished)

## 5. Immediate next steps (pick what you want first)

1. Get a real Postgres database (local install, or free hosted: Supabase / Neon / Railway) and put its connection string in `.env`
2. Run `npm run prisma:migrate` to create the tables, then `npm run db:seed` for the sample admin + components
3. Run `npm run dev` and click through: log in → create a page → add a Hero block → view it live
4. Then decide what to build next: Post editor? Media upload? Public API?
5. First git commit + push to GitHub (nothing has been pushed yet — say the word and I will, or you can review the files first)

---
*This file is meant to be kept up to date — ask to have it revised as things change.*
