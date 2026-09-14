# Custom CMS — Project Plan & Status

Tracking file for this project. Update this as work progresses so it's always
clear what's done, what's in progress, and what's next.

GitHub repo: https://github.com/itsmeyuukii/custom-cms
(pushed to `main`, history split into small logical commits — run
`git log --oneline` to see them)

See also: [COLLECTIONS_PLAN.md](COLLECTIONS_PLAN.md) (design for the
Payload-style Collections system), [SECURITY_REVIEW.md](SECURITY_REVIEW.md)
(vulnerability findings), [RBAC_PLAN.md](RBAC_PLAN.md) (design for
database-driven, admin-configurable roles/departments — replaces the
fixed ADMIN/EDITOR/VIEWER enum with roles an admin creates and assigns
permissions to)

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
- `src/lib/rbac.ts` — role-based access control (`requireRole`/`hasRole`), enforced on every Pages write action and reflected in the admin UI (VIEWER is read-only; ADMIN/EDITOR can write)
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
- `prisma/seed.ts` — creates one login per role (`admin@example.com` / `editor@example.com` / `viewer@example.com`, all password `changeme123`) and registers the two example Components, so there's something to click on/edit and every role is testable
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

## 5. Roadmap & priorities

Ordered by "do this before that," not just a wishlist — each phase either
unblocks the next one or is cheap enough that there's no reason to delay
it. Revisit this ordering any time priorities actually change; it's a
default sequence, not a locked contract.

**Build next, in order:**

1. Read-only REST API (Pages & Posts) — design in §6 below
2. RBAC v2 — full design in [RBAC_PLAN.md](RBAC_PLAN.md)
3. Media upload
4. Collections system
5. Enforce Collections access via RBAC v2

Reasoning for that order, and everything after it, follows.

### P0 — fix now, before building on top of it

~~**Close the authorization gap**~~ — **Done, 2026-09-15.** See
[SECURITY_REVIEW.md](SECURITY_REVIEW.md) findings #1/#2 and
[src/lib/rbac.ts](../src/lib/rbac.ts): `requireRole()`/`hasRole()`
with a `WRITE_ROLES = ["ADMIN", "EDITOR"]` list, enforced in every
Pages write action and reflected in the admin UI. Verified against all
three seeded roles. This is the RBAC that RBAC v2 (below) replaces —
it's correct as far as it goes, just hardcoded to three fixed roles.

### P1 — build these next, in this order

1. **Read-only REST API for Pages & Posts** (design below, §6). The
   data model already exists; this is mostly wiring around already-tested
   queries, not design — the lowest-risk, fastest-value item on the whole
   board. **Zero dependency on RBAC v2**: read endpoints are public and
   stay public, so there's no reason to wait on the permissions rework.
   Directly satisfies the original "public API for a separate frontend"
   goal.
2. **RBAC v2 — database-driven roles & permissions** (full plan in
   [RBAC_PLAN.md](RBAC_PLAN.md)). Bigger than item 1,
   but it's the highest-leverage remaining piece: it's what Media upload,
   Collections' access config, and any future API write endpoints all
   need, and building any of those against the current `WRITE_ROLES`
   enum first just means redoing their authorization wiring once this
   lands. Better to absorb that cost once, here, than three times later.

### P2 — depend on RBAC v2 being done

3. **Media upload flow.** Sequenced after RBAC v2 (moved back from an
   earlier draft of this plan that had it in P1) so its write action is
   built once, correctly, against `requirePermission("media:upload")`
   instead of the soon-to-be-replaced `WRITE_ROLES`. Still needs its own
   small decision before starting: where files actually live (local
   disk vs. a hosted object store) — not resolved here, resolve it when
   this item starts.
4. **Collections system** — see [COLLECTIONS_PLAN.md](COLLECTIONS_PLAN.md).
   Its `access` config is specified in terms of RBAC v2's permission
   keys (see that doc's updated note near `CollectionConfig`), so it
   comes after item 2 for the same reason Media upload does. Once it
   lands, the hand-written Pages/Posts API from item 1 generalizes into
   `/api/v1/:collection` per that plan's phase 7, and Posts gets migrated
   to be its first real collection.
5. **Enforce Collections' `access` config** using RBAC v2's permission
   keys on both the admin UI and the REST API — one permission system,
   not two.

### P3 — polish & operations (once the above is stable)

6. Rate limiting on login and on public API endpoints
   ([SECURITY_REVIEW.md](SECURITY_REVIEW.md) finding #4)
7. Automated tests
8. CI (lint/type-check/build on push), then decide on a deployment target

## 6. REST API design (P1 item 1 above)

Goal: let a separate frontend (or any external client) read published
content over HTTP, without touching the admin UI. Read-only to start —
write access waits for RBAC v2 (P1 item 2) and reuses its permission
model rather than the `WRITE_ROLES` enum this API doesn't otherwise need.

### Routes

Implemented as Next.js Route Handlers, versioned from day one so a future
breaking change doesn't disturb existing consumers:

```
src/app/api/v1/pages/route.ts          GET  — list published pages
src/app/api/v1/pages/[slug]/route.ts   GET  — one published page, blocks resolved
src/app/api/v1/posts/route.ts          GET  — list published posts
src/app/api/v1/posts/[slug]/route.ts   GET  — one published post
```

Both `[slug]` handlers reuse the exact same Prisma query already written
in [src/app/[slug]/page.tsx](../src/app/[slug]/page.tsx) (`status:
"PUBLISHED"` filter, `blocks` included ordered + joined to `component`) —
this is why it's low-risk, low-effort work: no new query logic, just a
JSON-serializing wrapper around queries that already exist and are
already tested.

### Response shape

One consistent envelope, not a per-endpoint bespoke shape:

```ts
// success — single item
{ "data": { ... } }

// success — list
{ "data": [ ... ], "meta": { "page": 1, "pageSize": 20, "total": 57 } }

// error
{ "error": { "code": "NOT_FOUND", "message": "..." } }
```

A small `src/lib/api-response.ts` helper (`apiSuccess(data, meta?)`,
`apiError(code, message, status)`) keeps every route consistent instead
of each one hand-rolling `NextResponse.json(...)`.

Pagination: simple `?page=1&pageSize=20` query params (offset-based) to
start — easy to reason about for a CMS-content use case, easy to `LIMIT`/
`OFFSET` in the underlying Prisma call. Cap `pageSize` server-side (e.g.
100) so a client can't request an unbounded result set.

### Auth

- **Read endpoints stay public**, same trust boundary as the existing
  public `/[slug]` page: only ever return `status: "PUBLISHED"` content,
  never draft/archived, regardless of who's asking.
- **Write endpoints** (not built yet) go behind
  `requirePermission(...)` from RBAC v2 (see
  [RBAC_PLAN.md](RBAC_PLAN.md)) once that lands — no separate auth
  system. For a headless client that isn't a logged-in browser session
  (e.g. a build script), add a scoped `ApiKey` model (`key` hash, a set
  of permission keys, optional expiry) rather than expecting external
  clients to hold NextAuth session cookies.
- Rate limit before this is public-facing beyond localhost (P3, ties to
  [SECURITY_REVIEW.md](SECURITY_REVIEW.md) finding #4) — an unauthenticated
  read endpoint is also the easiest thing to hammer.

### Relationship to the Collections system

This hand-written Pages/Posts API is intentionally a stepping stone, not
a parallel system to maintain forever. Once
[COLLECTIONS_PLAN.md](COLLECTIONS_PLAN.md) phase 7 lands, its generic
`/api/v1/:collection` and `/api/v1/:collection/:slug` routes are meant to
absorb Posts (its first real collection) — `Page` can either stay
hand-written (it has its own Block/Component rendering concerns a generic
collection doesn't) or become a collection itself later; that's an open
question, not a decision made yet.

## 7. Known gotchas (so you don't get stuck on these again)

- **Prisma 7 changed how the database URL is configured.** It's no longer in `schema.prisma` — it lives in `prisma.config.ts` and the actual Postgres connection happens through a "driver adapter" (`@prisma/adapter-pg`) passed into `PrismaClient`. Any online tutorial using `datasource db { url = env(...) }` is for an older Prisma version and won't work here.
- **Next.js 16 renamed `middleware.ts` to `proxy.ts`.** We hit this directly — the old `middleware.ts` runs in the Edge runtime, which can't load Prisma's Postgres driver, and every `/admin` request 500'd until we renamed the file.
- **The local Postgres password was reset once**, on 2026-09-14, to get a working connection (nobody on this project had the original password). New password lives only in `.env` (gitignored).

---
*This file is meant to be kept up to date — ask to have it revised as things change.*
