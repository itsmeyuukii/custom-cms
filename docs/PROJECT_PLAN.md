# Custom CMS — Project Plan & Status

Tracking file for this project. Update this as work progresses so it's always
clear what's done, what's in progress, and what's next.

GitHub repo: https://github.com/itsmeyuukii/custom-cms
(pushed to `main`, history split into small logical commits — run
`git log --oneline` to see them)

**Live production URL: https://custom-cms-lyart.vercel.app** (Vercel +
Prisma Postgres, both free tier)

See also: [../CLAUDE.md](../CLAUDE.md) (code conventions — read this
before writing new code, so style/patterns stay consistent),
[SEEDING.md](SEEDING.md) (how to run `prisma/seed.ts`, locally and
against a remote database, without risking your local dev pointing at
production), [MONOREPO_PLAN.md](MONOREPO_PLAN.md) (design for
restructuring into a monorepo — the CMS moves to `apps/cms/`, plus one
or more separate frontend "site" apps consuming its REST API, run
together locally via Turborepo), [COLLECTIONS_PLAN.md](COLLECTIONS_PLAN.md)
(design for the Payload-style Collections system),
[MEDIA_PLAN.md](MEDIA_PLAN.md) (design for the media upload flow,
Vercel Blob-backed),
[ADMIN_THEME_PLAN.md](ADMIN_THEME_PLAN.md) (design for a shared admin
component library/theme, styled after Catalyst without redistributing
its licensed source),
[E2E_TESTING_PLAN.md](E2E_TESTING_PLAN.md) (design for Playwright
e2e + visual regression testing),
[SECURITY_REVIEW.md](SECURITY_REVIEW.md) (vulnerability findings),
[RBAC_PLAN.md](RBAC_PLAN.md) (design for database-driven,
admin-configurable roles/departments — replaces the fixed
ADMIN/EDITOR/VIEWER enum with roles an admin creates and assigns
permissions to)

---

## 1. Decisions made

| Decision      | Choice                                                          | Why                                                                                                                                                  |
| ------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework     | Next.js (TypeScript, App Router, Tailwind)                      | One full-stack app — frontend + backend in one codebase                                                                                              |
| Database      | PostgreSQL                                                      | Relational, good fit for structured content (pages, posts, users)                                                                                    |
| ORM           | Prisma                                                          | Type-safe database access, generates a client from `prisma/schema.prisma`                                                                            |
| Auth          | NextAuth v5 (Credentials provider: email + password)            | Login + roles (Admin / Editor / Viewer)                                                                                                              |
| Content model | Pages & Posts, made of reusable "Components" placed as "Blocks" | So a Page is built by picking components (Hero, Card Grid, etc.) and filling in their content — this is the "components to use in pages" requirement |

## 2. Packages installed (and what each is for)

| Package                        | Role                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `next`, `react`, `react-dom`   | The web framework itself                                                                                                             |
| `tailwindcss`                  | Styling                                                                                                                              |
| `typescript`, `@types/*`       | Type checking                                                                                                                        |
| `eslint`, `eslint-config-next` | Code linting                                                                                                                         |
| `prisma`, `@prisma/client`     | Database ORM — defines the data model and talks to Postgres                                                                          |
| `@prisma/adapter-pg`, `pg`     | Prisma 7 requires a "driver adapter" to actually connect to Postgres (this is new in Prisma 7 vs older tutorials you may see online) |
| `dotenv`                       | Loads `.env` values for Prisma's config file                                                                                         |
| `next-auth` (v5 beta)          | Login/session handling                                                                                                               |
| `@auth/prisma-adapter`         | Lets NextAuth store users/sessions in the Postgres database via Prisma                                                               |
| `bcryptjs`                     | Hashes passwords before storing them                                                                                                 |
| `tsx`                          | Lets us run TypeScript seed scripts directly (`npm run db:seed`)                                                                     |

No image upload or email-sending packages yet — those come later
depending on priorities. Hosting/deployment isn't a package but is done
(see below): Vercel, with Prisma Postgres as the production database.

## 3. What's built so far

**Tested end-to-end and working.** A local Postgres database is connected,
migrated, and seeded. Verified by hand: logged in as the seeded admin,
created a page with a Hero block via Prisma, and confirmed it rendered
correctly at its public URL with real data from the database.

- `prisma/schema.prisma` — the data model:
  - `User`, with roles/permissions via RBAC v2's `Role`/`Permission`/
    `UserRole`/`RolePermission` (see [RBAC_PLAN.md](RBAC_PLAN.md)) — the
    old fixed `role` enum field was dropped once RBAC v2 fully replaced it
  - `Page`, `Post` — content, with a `status` (DRAFT / PUBLISHED / ARCHIVED)
  - `Component` — a reusable block _definition_ (e.g. "Hero", "Card Grid")
  - `Block` — one _instance_ of a Component placed on a specific Page, with its own content
  - `Media` — uploaded file records (no upload UI yet, just the table)
- `src/lib/auth.ts` — NextAuth config (email/password login, JWT sessions, `roleSlugs` attached to session)
- `src/lib/rbac.ts` — RBAC v2 (`requirePermission`/`hasPermission`, see [RBAC_PLAN.md](RBAC_PLAN.md)), enforced on every Pages write action and reflected in the admin UI (Viewer is read-only; Admin/Editor can write, per the seeded system roles' permissions)
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
- `prisma/seed.ts` — creates one login per role (`admin@example.com` / `editor@example.com` / `viewer@example.com`, all sharing one password) and registers the two example Components, so there's something to click on/edit and every role is testable. Password comes from `SEED_USER_PASSWORD` in the environment (falls back to `changeme123` locally only, with a warning) — never hardcoded, so a real value is required before seeding anything shared/production.
- `.env.example` — template of the environment variables needed (`DATABASE_URL`, `AUTH_SECRET`)
- `.env` — your actual local values (gitignored, never committed). Currently points at a local Postgres database called `custom_cms` running on this machine.
- `prisma/migrations/` — the migration that created all the tables, committed to git so anyone cloning the repo can run `prisma migrate deploy`/`dev` and get the same schema
- `src/lib/api-response.ts` + `src/app/api/v1/{pages,posts}/route.ts` + `src/app/api/v1/{pages,posts}/[slug]/route.ts` — the read-only REST API (see §6). Consistent `{ data }`/`{ data, meta }`/`{ error }` envelope, offset pagination with a server-side `pageSize` cap of 100, published-only content. Verified end-to-end against real data: single-item found/not-found for both resources, empty list, populated list, and pagination actually slicing results correctly across pages.
- **Deployed to production**: https://custom-cms-lyart.vercel.app — Vercel (app hosting, auto-deploys on push to `main`) + Prisma Postgres (production database, free tier). `package.json`'s `build` script runs `prisma generate && prisma migrate deploy && next build`, so schema migrations apply automatically on every deploy. Verified working end-to-end against the live site: the production REST API (`/api/v1/pages`) returns real data from the real production database with the correct response shape.
- `CLAUDE.md` — code conventions (file layout, auth pattern, API conventions, verification standard, git conventions) read automatically at the start of work in this repo, so style stays consistent without having to re-derive it each time.
- **Media upload** — full design in [MEDIA_PLAN.md](MEDIA_PLAN.md), Phases 1–2 done 2026-09-17: `uploadMedia` Server Action (`src/app/admin/media/actions.ts`), gated on `media:upload`, validates mime type (image png/jpeg/gif/webp only) and a 4MB size cap, then uploads via Vercel Blob (`@vercel/blob`, `access: "public"`) and records the result in the `Media` table. `/admin/media` has a real upload form (file + alt text) and shows uploaded files as thumbnails with a copyable URL, since there's no visual Block editor yet to wire a picker into — the URL gets pasted into a Block's raw JSON (e.g. `CardGrid.imageUrl`) by hand. Verified end-to-end against a real Vercel Blob store: logged in as the seeded editor via a real NextAuth credentials POST, drove the actual rendered form via a real multipart POST against its real `$ACTION_ID_...` (not simulated), confirmed a real `Media` row was created with the correct `uploaderId`/`mimeType`/`size`, and confirmed the returned Blob URL was genuinely publicly fetchable (200, correct content-type) before cleaning up the test blob and row. **Phase 3 (deletion) done 2026-09-17**: `deleteMedia(mediaId)`, gated on `media:delete` (an Admin-only permission — the seeded Editor role doesn't hold it, matching `RBAC_PLAN.md`'s system-role seed), calls Vercel Blob's `del()` then removes the `Media` row; a "Delete" button per grid item, rendered only when the session holds `media:delete`. Verified end-to-end: uploaded a real test file as editor, logged in as admin and drove the real bound server action (`deleteMedia.bind(null, item.id)`, extracting the real `$ACTION_2:0`/`$ACTION_2:1` bound-arg fields from the rendered form) — confirmed the Blob URL 404'd afterward and the `Media` table was empty. Separately confirmed the permission gate is enforced server-side, not just hidden in the UI: attempting the same action as editor (who lacks `media:delete`) came back a real `500` with `requirePermission`'s `Forbidden: insufficient permissions` error, not a silently-hidden button.

## 4. What's NOT done yet

- Posts have no create/edit form (list only)
- Block content is entered as raw JSON in the admin — no real visual editor
- No automated tests
- Collections system — designed, not built (RBAC v2 shipped, see §5 item 2)
- Branch protection not configured — CI reports status but doesn't yet block a failing merge
- No rate limiting (login or public API)

`npm run format:check`, `npm run lint`, and `npm run typecheck` all pass
clean as of this writing, and CI runs all three on every push/PR.

## 5. Roadmap & priorities

Ordered by "do this before that," not just a wishlist — each phase either
unblocks the next one or is cheap enough that there's no reason to delay
it. Revisit this ordering any time priorities actually change; it's a
default sequence, not a locked contract.

**Build next, in order:**

1. ~~Read-only REST API (Pages & Posts)~~ — done, 2026-09-15
2. ~~RBAC v2~~ — done, 2026-09-16. Full design in [RBAC_PLAN.md](RBAC_PLAN.md)
3. ~~Media upload~~ — done, 2026-09-17 (upload + deletion)
4. Admin UI theme (component library) — see [ADMIN_THEME_PLAN.md](ADMIN_THEME_PLAN.md).
   Runs alongside Collections' non-UI phases (config shape, `Document`
   model, validation); should be ready before Collections Phase 5
   (the generic admin UI), so that UI is built on it directly instead
   of needing to migrate later.
5. E2E & visual regression testing (Playwright) — see
   [E2E_TESTING_PLAN.md](E2E_TESTING_PLAN.md). Functional coverage
   (auth/RBAC/CRUD) is independent and valuable immediately; visual
   coverage tracks the admin theme rollout phase-by-phase as it lands.
6. Collections system
7. Enforce Collections access via RBAC v2

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

1. ~~**Read-only REST API for Pages & Posts**~~ — **Done, 2026-09-15.**
   4 routes (design below, §6), built hands-on with guidance rather than
   written wholesale — verified end-to-end against real data (single-item
   found/not-found, empty list, populated list, pagination slicing
   correctly across pages). Directly satisfies the original "public API
   for a separate frontend" goal.
2. **RBAC v2 — database-driven roles & permissions** (full plan in
   [RBAC_PLAN.md](RBAC_PLAN.md)). It's the highest-leverage remaining
   piece: it's what Media upload, Collections' access config, and any
   future API write endpoints all need, and building any of those
   against the current `WRITE_ROLES` enum first just means redoing their
   authorization wiring once this lands. Better to absorb that cost
   once, here, than three times later.

   - **Phase 1 (data model), done 2026-09-16**: `Permission`/`Role`/
     `RolePermission`/`UserRole` tables added additively — the old
     `Role` enum was renamed to `LegacyRole` (not dropped) so it could
     coexist with the new `Role` table without a name clash; existing
     `User.role` data was preserved via an `ALTER TYPE ... RENAME` in
     the migration SQL rather than the drop/recreate Prisma would have
     generated automatically, which would have nulled every user's
     role. Seeded the 12 permission keys from RBAC_PLAN.md §2 and three
     system roles (Admin/Editor/Viewer) matching today's behavior
     exactly, and backfilled a `UserRole` row for every existing user.
     Verified: seed is idempotent, `format:check`/`lint`/`typecheck`
     all pass, app boots and `/api/v1/pages` still works — no
     authorization code touched yet, so no behavior change expected.
   - **Phase 2 (`requirePermission`/`hasPermission`, call-site
     migration), done 2026-09-16**: `src/lib/rbac.ts` rewritten —
     `hasRole`/`requireRole`/`WRITE_ROLES` replaced by
     `hasPermission(roleSlugs, key)`/`requirePermission(key)`, both
     querying `RolePermission` fresh on every call (no permission
     caching, per RBAC_PLAN.md §3). `session.user.role` (enum) replaced
     with `session.user.roleSlugs: string[]`, populated in
     `src/lib/auth.ts`'s `authorize()`/`jwt`/`session` callbacks from
     each user's live `UserRole` rows at login time — role
     _assignment_ is frozen until re-login by design, but a role's
     _permissions_ are always looked up fresh, so revoking one takes
     effect immediately for everyone holding that role. All call sites
     in `actions.ts` and the admin Pages UI migrated to permission keys
     (`pages:create`, `pages:edit`). One real design gap surfaced and
     was resolved with the user: RBAC_PLAN.md's taxonomy suggested
     gating `setPageStatus` on `pages:publish`, but the seeded Editor
     role doesn't hold that permission — doing so would have silently
     regressed today's behavior (editors can currently publish).
     Resolved by gating all status transitions on `pages:edit` instead,
     preserving current behavior exactly; `pages:publish` stays defined
     but unused until there's a real distinction to enforce. Verified
     against the real app, not just types: logged in as all three
     seeded users via the actual credentials flow, confirmed
     `roleSlugs` and permission-gated UI matched expectations for each
     (dashboard, pages list, `/admin/pages/new` access), then drove the
     real `createPage` server action directly as editor (multipart
     POST with the page's actual `$ACTION_ID_...` field) — a real page
     was created and redirected to correctly — and as viewer, where
     `requirePermission` genuinely threw `Forbidden: insufficient
permissions` server-side (not just a hidden button), confirmed via
     the 500 response's error digest. Test page cleaned up after.
   - **Phase 3 (`/admin/roles` — view/edit existing roles), done
     2026-09-16**: `/admin/roles` (list: name, description, permission
     count, user count) and `/admin/roles/[id]` (edit name/description,
     checkbox grid of every `Permission` grouped by `group`) — both
     gated on `roles:manage` itself, and the sidebar's "Roles" link
     only renders for users who hold it. No role _creation_ yet, per
     the plan's phase 3 scope — proving the query shape on existing
     seeded roles first. Also resolved RBAC_PLAN.md's other flagged
     open question (lockout protection): `updateRole` now blocks a save
     that would leave nobody in the system holding `roles:manage`,
     checked before the transaction runs. Verified against the real
     app: as admin, confirmed the roles list shows the correct
     permission/user counts (12/1, 5/1, 0/1), then drove the real
     `updateRole` server action directly (multipart POST with the
     bound action's actual `$ACTION_1:0`/`$ACTION_1:1` fields) to add
     `pages:publish` to Editor — the list correctly showed 6
     permissions afterward — then reverted it back to 5. Separately
     attempted to strip `roles:manage` from Admin (the only holder) and
     confirmed the request came back `500` with the lockout guard's
     error message, and that Admin's permission count stayed at 12
     (no partial write). Also confirmed editor/viewer get redirected
     away from `/admin/roles` and don't see the nav link.
   - **Phase 4 (`/admin/users` — list users, assign/remove roles), done
     2026-09-16**: `/admin/users` (list: name, email, current roles)
     and `/admin/users/[id]` (checkbox grid of every `Role`, posting to
     `updateUserRoles`) — both gated on `users:manage`, sidebar link
     included. Also resolved the follow-on lockout question RBAC_PLAN.md
     flagged when this phase was scoped: `updateUserRoles` blocks a
     save that would leave nobody holding `users:manage` _or_ nobody
     holding `roles:manage` (not just the former — a `roles:manage`
     lockout has no recovery path through this page either). Verified
     against the real app: as admin, listed all three seeded users with
     correct roles, then drove the real `updateUserRoles` action
     directly (multipart POST with the bound action's `$ACTION_1:0`/
     `$ACTION_1:1` fields) to add Admin to editor's roles — confirmed
     in the database — then reverted it. Separately attempted to strip
     Admin's only role (the sole holder of both `users:manage` and
     `roles:manage`) and confirmed the request came back `500` with the
     lockout guard's error message and no partial write. Also confirmed
     editor gets redirected away from `/admin/users` and doesn't see
     the nav link.
   - **Phase 5 (role _creation_ from the admin UI), done 2026-09-16**:
     `/admin/roles/new` (name/slug/description form, same shape as
     `/admin/pages/new`) posts to `createRole`, which creates the role
     with zero permissions and redirects straight to `/admin/roles/[id]`
     to set them — matching how a new page starts with no blocks. No
     lockout concern here (a brand-new role holds no users yet, so it
     can't be anyone's last permission). Verified against the real app:
     as admin, drove the real `createRole` action directly (multipart
     POST with `$ACTION_ID_...`) to create a "Marketing" role — it
     showed up on the roles list and its edit page with 0 permissions
     checked — then attempted a second create with the same slug and
     confirmed it came back `500` on the `Role_slug_key` unique
     constraint (no orphan row created). Also confirmed editor gets
     redirected away from `/admin/roles/new`. Test role deleted after.
   - **Phase 6 (drop the legacy enum), done 2026-09-16 — RBAC v2
     complete**: migration `20260916054538_drop_legacy_role` drops
     `User.role` and the `LegacyRole` enum; `prisma/seed.ts` now
     assigns each seeded user's `UserRole` directly instead of
     backfilling from the enum. Before merging, confirmed via
     `git grep` that nothing outside `schema.prisma`/`seed.ts`
     referenced the legacy field or enum anymore. Verified locally:
     applied the migration, reseeded, logged in as each of
     admin/editor/viewer and confirmed `roleSlugs` in the session
     matched, confirmed editor could still create a page and viewer
     was still blocked from `/admin/pages/new`. **Production
     verification mattered here more than usual**: this repo has a
     live Vercel deployment where `prisma migrate deploy` runs
     automatically on every deploy (`package.json`'s `build` script),
     and the RBAC v2 backfill (assigning `UserRole` from each user's
     legacy enum value) only ever happened via `prisma/seed.ts` — never
     as part of a schema migration. So before merging, ran the updated
     seed script against the actual production database (via a
     temporary `DATABASE_URL` override, per `docs/SEEDING.md`) and
     confirmed it reported backfilling all 3 real production users —
     without that check, merging could have dropped the only record of
     each production user's role with nothing in `UserRole` to replace
     it, stranding everyone with zero permissions.

### P2 — depend on RBAC v2 being done

3. ~~**Media upload flow**~~ — **done, 2026-09-17** (all 3 phases: upload,
   admin UI, deletion). Full design in [MEDIA_PLAN.md](MEDIA_PLAN.md);
   see §3 above for what shipped and how it was verified.
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

6. ~~CI (lint/type-check on push)~~ — **Done, 2026-09-15**, pulled
   forward out of P3 on request since it's independent of everything
   else. `.github/workflows/ci.yml` runs on every push to `main` and
   every PR: `npm install`, `prisma generate`, `next typegen`, then
   `format:check` + `lint` + `typecheck`. Hit two real issues getting it
   green — worth knowing about, see §7 gotchas below. **Not yet done:**
   making this a required check in GitHub's branch protection settings
   (so a failing PR is actually blocked from merging, not just flagged)
   — that's a repo-settings change only doable from the GitHub UI itself.
7. Rate limiting on login and on public API endpoints
   ([SECURITY_REVIEW.md](SECURITY_REVIEW.md) finding #4)
8. Automated tests
9. ~~Deployment target~~ — **Done, 2026-09-15.** Live at
   https://custom-cms-lyart.vercel.app (Vercel + Prisma Postgres, both
   free tier, not Neon as originally planned — Vercel's own first-party
   Prisma Postgres integration turned out to be the smoother path than
   a separate Neon signup). See §7 gotchas — this took several real
   fixes to get working (env var wiring, build script, deployment
   protection). Production database is migrated _and_ seeded (admin/
   editor/viewer accounts, real password, verified via an actual login
   against the live site). Still open: Deployment Protection is still
   on for non-canonical URLs (fine, canonical production URL is
   already public — only matters if those other URLs need to be public
   too).
10. **Monorepo / multi-site restructure** — full design in
    [MONOREPO_PLAN.md](MONOREPO_PLAN.md). Not sequenced relative to the
    other P3 items above (independent concern — repo/deployment
    structure, not app features); start whenever there's an actual
    first site to build. Design-only so far, not started.

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
`OFFSET` in the underlying Prisma call. Cap `pageSize` server-side (e.g. 100) so a client can't request an unbounded result set.

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
- **`npm ci` can fail in CI even when `npm install` works fine on your own machine.** We hit this: `package-lock.json` had incomplete entries for `@emnapi/runtime`/`@emnapi/core` — optional WASM-fallback dependencies of `sharp` with genuinely conflicting version requirements from different packages, which npm on Windows didn't fully resolve into the lockfile even after a clean reinstall. Fix was using `npm install` in CI instead of `npm ci` — slightly less strict, but sidesteps this class of cross-platform optional-dependency issue entirely. If `npm ci` ever fails in CI with "Missing: X from lock file" while `npm install` works locally, this is why.
- **`tsc --noEmit` can pass locally but fail in CI on Next.js's generated types** (e.g. `Cannot find name 'LayoutProps'`). `tsconfig.json` includes `.next/types/**` — but there are _two separate_ generated-types locations: `.next/types/` (from `next build` or `next typegen`) and `.next/dev/types/` (from `next dev`, populated the first time you ever run the dev server on a machine). Once you've run `next dev` locally even once, `tsc` quietly succeeds using the dev-server copy, masking that `.next/types/` was never generated — which CI, having never run `next dev`, doesn't have. Fix: run `npx next typegen` (generates types without a full build) before type-checking in CI.
- **`prisma migrate deploy` does not run `prisma generate` for you** — unlike `migrate dev`, which does. Our build script was `prisma migrate deploy && next build`, and it worked locally (because `node_modules/@prisma/client` was already generated from earlier local work) but failed on Vercel's genuinely fresh build with `Module '@prisma/client' has no exported member 'PrismaClient'` — the exact same "local leftover artifact masks a missing build step" trap as the `next typegen` gotcha above, just for a different generated artifact. Fix: `prisma generate && prisma migrate deploy && next build`.
- **A Vercel storage integration's "Custom Prefix" field doesn't rename one variable — it prepends to several at once.** Connecting a database integration (e.g. Prisma Postgres) actually creates multiple env vars under the hood (a pooled URL, a direct URL, a provider-specific one — in our case suffixed `_POSTGRES_URL`, `_DATABASE_URL`, `_PRISMA_DATABASE_URL`). The "Custom Prefix" field prepends whatever you type (plus the visible trailing `_URL`) to _all_ of them, so typing "DATABASE" to try to get a clean `DATABASE_URL` instead produces `DATABASE_URL_POSTGRES_URL`, `DATABASE_URL_DATABASE_URL`, etc. — none of them literally `DATABASE_URL`. Easiest fix: leave the prefix empty when connecting (the default unprefixed name is often already what you want), or just manually create/edit a plain `DATABASE_URL` variable with the real value copied from one of the generated ones afterward.
- **Some Vercel env vars marked "Secret" genuinely cannot be viewed or copied from the dashboard once saved** — no eye icon, and even "Copy to Clipboard" can show as locked/disabled in the `...` menu depending on how the variable was created (e.g. by an integration). If you need the actual value and it's locked in Vercel, check the integration/provider's own dashboard instead (e.g. Prisma Postgres's own resource page has a "Quickstart" panel showing real connection strings in plain, copyable text) — don't assume Vercel's UI is the only source of truth for a value you set there.
- **Vercel's Deployment Protection blocks unauthenticated access to _every_ URL for a project by default, including what looks like it should be the public production site** — requests get a `302` to `vercel.com/sso-api`. This can make you think a deployment is broken when it's actually just protected. Check **Settings → Deployment Protection** and disable it for Production if the site is meant to be public. Separately: **the actual canonical production domain is whatever's listed under a deployment's "Domains" section — never guess it from the project name.** `<project-name>.vercel.app` is a _global_ namespace across all Vercel users, not scoped to your account — if that exact name is already taken by someone else, Vercel silently assigns a different one (ours ended up `custom-cms-lyart.vercel.app`, not `custom-cms.vercel.app`), and querying the guessed-wrong one will hit a completely unrelated stranger's app with no error indicating the mismatch.

---

_This file is meant to be kept up to date — ask to have it revised as things change._
