@AGENTS.md

# Custom CMS — Project Conventions

Read this before writing code in this repo. Full context lives in
`docs/` — [PROJECT_PLAN.md](docs/PROJECT_PLAN.md) is the source of
truth for status/roadmap; this file is about _how_ to write code here
consistently, not _what_ to build next.

## Stack

Next.js (App Router, TypeScript, Tailwind) + Prisma 7 (driver adapter,
not the old `url` field) + PostgreSQL + NextAuth v5. See
`docs/INSTALLATION.md` if reproducing this setup elsewhere — it has
exact commands and the gotchas hit getting each piece working.

## File layout conventions

- `src/app/` — routes (App Router). `page.tsx` for pages, `route.ts`
  for API handlers, `proxy.ts` at `src/` root for route-gating
  (**not** `middleware.ts` — that's the deprecated Next.js 16 name and
  runs in the Edge runtime, which breaks Prisma's `pg` driver).
- `src/lib/` — shared server-side utilities: `prisma.ts` (DB client),
  `auth.ts` (NextAuth config), `rbac.ts` (authorization), `api-response.ts`
  (REST response envelope).
- `src/components/blocks/` — the reusable page-building components
  (Hero, CardGrid, ...) plus `registry.tsx` (key → component map) and
  `BlockRenderer.tsx`. Adding a new block type means: a component here,
  an entry in `registry.tsx`, and a matching `Component` row (with a
  JSON Schema) in `prisma/seed.ts` or created via the admin.
- `prisma/` — `schema.prisma`, `migrations/` (committed), `seed.ts`.
- `docs/` — all planning/reference docs. Every substantial feature gets
  a design doc here _before_ being built (see `COLLECTIONS_PLAN.md`,
  `RBAC_PLAN.md` as examples) — write the plan, get it reviewed/agreed,
  then implement.

## Code conventions

- **Server Components by default.** Only add `"use client"` when you
  actually need interactivity/hooks (see `src/components/providers.tsx`,
  `src/app/login/page.tsx` for the only two current examples).
- **Server Actions for admin mutations** (`"use server"` at the top of
  an `actions.ts` file, e.g. `src/app/admin/pages/actions.ts`), not API
  routes — API routes (`src/app/api/`) are for the external-facing REST
  API only.
- **Authorization: every mutating action starts with a role check,
  before any database write.** Use `requireRole(WRITE_ROLES)` from
  `src/lib/rbac.ts` (throws if unauthorized) in Server Actions, and
  `hasRole(session?.user?.role, WRITE_ROLES)` (boolean) to conditionally
  render write-only UI. Don't rely on the UI hiding a control as the
  only protection — the server action itself must check too (this was
  a real Critical-severity bug once, see `docs/SECURITY_REVIEW.md`).
- **Prisma types, not hand-written ones.** Import types from
  `@prisma/client` (`import type { Role } from "@prisma/client"`)
  rather than redefining shapes that already exist in the schema.
- **TypeScript strict mode is on.** Don't add `any` to work around a
  type error — find the real shape. The one existing exception
  (`src/components/blocks/registry.tsx`) is deliberate and commented,
  for a genuinely polymorphic component map.

## REST API conventions (`src/app/api/v1/`)

- Versioned from day one: `/api/v1/...`.
- Every response goes through `apiSuccess`/`apiError` from
  `src/lib/api-response.ts` — never hand-roll `NextResponse.json(...)`
  in a route handler. Success: `{ data }` or `{ data, meta }`. Error:
  `{ error: { code, message } }`.
- List endpoints: offset pagination via `?page=&pageSize=`, `pageSize`
  capped server-side at 100 (`Math.min(pageSize, 100)`) — never trust a
  client-supplied limit unbounded.
- Read endpoints are public and only ever return `status: "PUBLISHED"`
  content — draft/archived content must never leak through the public
  API regardless of who's asking (no auth check needed _because_ of
  this filter, not despite it).
- Write endpoints (none exist yet) must use the same role/permission
  system as the admin UI — no separate auth path.

## Database conventions

- Schema changes: edit `prisma/schema.prisma`, then
  `npx prisma migrate dev --name <description>` locally (commit the
  generated migration). Production applies migrations automatically on
  deploy (`prisma migrate deploy` runs as part of the Vercel build
  script) — never run `migrate dev` against production.
- **`prisma generate` must be an explicit step in any build/CI script**
  that type-checks or builds this project — don't assume it happened.
  `migrate deploy` does _not_ auto-run it the way `migrate dev` does,
  and a locally-generated client sitting in `node_modules` will mask a
  missing step until a genuinely clean environment (CI, a fresh Vercel
  build) exposes it. Hit this exact bug twice — see
  `docs/PROJECT_PLAN.md` §7 "Known gotchas".
- Seed script (`prisma/seed.ts`) is idempotent (`upsert`, never
  `create` alone) and reads `SEED_USER_PASSWORD` from the environment
  rather than hardcoding a real password — falls back to `changeme123`
  only for local convenience, with a console warning.

## Before committing, always run

```
npm run format:check
npm run lint
npm run typecheck
```

(`npm run format` to actually fix formatting issues it finds.) CI runs
these same three on every push/PR — see `.github/workflows/ci.yml`.

## Verification standard

Don't trust type-checking alone for anything touching the database or
auth. Before considering a feature done: create real (temporary) test
data, hit the actual route/action against it, confirm the real
response/behavior, then clean up the temporary data _and_ delete any
one-off test scripts — never leave scratch scripts in the repo. This
project's history has repeated examples (`prisma/test-page.ts`,
`cleanup-test.ts` pattern) — always temporary, always removed after.

## Git conventions

- Small, logical commits — one concern per commit, not one giant dump.
  Conventional prefixes: `feat:`, `fix:`, `docs:`, `chore:`.
- Every design decision worth remembering later goes in `docs/`, not
  just in a commit message — commit messages explain _what changed_,
  `docs/PROJECT_PLAN.md`'s "Known gotchas" section is for _lessons that
  would otherwise get relearned the hard way_.
