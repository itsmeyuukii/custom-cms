# Security / Vulnerability Review

Manual review of the codebase as of commit `b917786` (2026-09-14). Not a
scan — read through every auth-adjacent and data-writing path by hand.
Re-run this kind of pass after the Collections system and Media upload
land (see [COLLECTIONS_PLAN.md](COLLECTIONS_PLAN.md)), since both add new
attack surface not covered here.

## Summary

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Missing authorization on `addBlock` / `setPageStatus` server actions | **Critical** | Open |
| 2 | `Role` (ADMIN/EDITOR/VIEWER) is never actually enforced anywhere | **High** | Open |
| 3 | Block `data` accepted with no validation against its Component's schema, no size limit | Medium | Open |
| 4 | No rate limiting on login | Medium | Open |
| 5 | Seeded admin password is weak and documented in plaintext | Medium | Open — expected for local dev, must rotate before any shared/prod use |
| 6 | 4 high-severity advisories in Prisma CLI's transitive deps (`mysql2`, `deepmerge-ts`) | Low | Open, dev-tooling only |
| 7 | No security headers configured (CSP, `X-Frame-Options`, etc.) | Low | Open |
| 8 | `CardGrid` renders admin-supplied `imageUrl` with no allow-list | Low | Open |

---

## 1. Missing authorization on `addBlock` / `setPageStatus` — Critical

**File:** [src/app/admin/pages/actions.ts](../src/app/admin/pages/actions.ts)

```ts
export async function addBlock(pageId: string, formData: FormData) {
  // no auth() call at all
  ...
}

export async function setPageStatus(pageId: string, status: ...) {
  // no auth() call at all
  ...
}
```

`createPage` (same file, line 9) at least checks `session?.user?.id`
exists. `addBlock` and `setPageStatus` check nothing — they're exported
Server Actions, which Next.js turns into real POST endpoints. Their
action reference is embedded in the page's HTML/RSC payload, so anyone
who can load `/admin/pages/[id]` can extract it and call these actions
directly, bypassing the UI entirely, whether or not they're even logged
in — `proxy.ts` gates the *page* `/admin/*`, but does not automatically
gate every server action reachable from it.

**Impact:** any authenticated session (even none, if the action is called
directly without going through the gated page first — worth confirming
empirically) can create arbitrary blocks with arbitrary JSON on any page,
and publish/unpublish/archive any page.

**Fix:** add `const session = await auth(); if (!session?.user?.id) throw
new Error("Not authenticated");` to both functions, matching `createPage`.

## 2. `Role` is decorative — never enforced — High

**Files:** [src/proxy.ts](../src/proxy.ts),
[src/app/admin/pages/actions.ts](../src/app/admin/pages/actions.ts)

The only place `role` is even read is
[src/app/admin/page.tsx:9](../src/app/admin/page.tsx#L9), to *display* it.
`proxy.ts` only checks "is there a session" — not what role it belongs to.
So the `VIEWER` role (explicitly modeled in `prisma/schema.prisma` as a
role that should presumably *not* be able to edit content) currently has
identical write access to `ADMIN`.

**Fix:** decide the actual permission model (likely: VIEWER = read-only in
admin, EDITOR = create/edit but not publish or manage users, ADMIN =
everything) and enforce it in every server action — e.g. a small
`requireRole(session, ["ADMIN", "EDITOR"])` helper called at the top of
each action, not just `requireAuth`.

## 3. Block data has no schema validation or size limit — Medium

**File:** [src/app/admin/pages/actions.ts:29-55](../src/app/admin/pages/actions.ts#L29-L55)

Every `Component` row has a `schema` field (a JSON Schema describing its
expected props — see `prisma/seed.ts`), but `addBlock` never validates
`data` against it — any authenticated user (see #1/#2) can attach
arbitrary, unbounded JSON to any component. No `try/catch` around a
malformed shape breaking `BlockRenderer` at render time, and no size cap,
so a large payload can be written straight into Postgres.

**Fix:** validate `data` against `component.schema` before writing (the
[COLLECTIONS_PLAN.md](COLLECTIONS_PLAN.md) validation-by-config approach
generalizes this properly); at minimum, cap payload size and wrap render
in error boundaries.

## 4. No rate limiting on login — Medium

**File:** [src/lib/auth.ts](../src/lib/auth.ts) (Credentials provider),
`/api/auth/callback/credentials`

`bcrypt.compare` itself is timing-safe, but nothing limits how many login
attempts an IP/account can make. Combined with #5 (a guessable seeded
password), this is a realistic brute-force path once this app is exposed
beyond localhost.

**Fix:** add rate limiting at the route/middleware level (e.g. a small
in-memory or Redis-backed limiter keyed by IP + email) before this goes
anywhere public.

## 5. Seeded admin password — Medium (expected for now)

**File:** [prisma/seed.ts](../prisma/seed.ts) — `admin@example.com` /
`changeme123`, also written in plaintext in
[docs/PROJECT_PLAN.md](PROJECT_PLAN.md) and
[docs/INSTALLATION.md](INSTALLATION.md).

Fine for local dev (which is all that exists right now), but it's a
real credential sitting in git history in plaintext. **Must be rotated**
(or the seed script changed to require an env-provided password) before
this database is ever shared, deployed, or exposed beyond your machine.

## 6. Transitive dependency advisories — Low

`npm audit` reports 4 high-severity advisories, all inside `prisma`'s own
CLI dependency tree (`mysql2`, `deepmerge-ts` via `@prisma/config`) — not
in this app's runtime bundle (we use `@prisma/adapter-pg`, never
`mysql2`). `npm audit fix --force` would downgrade `prisma` to `6.19.3`, a
breaking major-version change, purely to silence a dev-tooling advisory
that doesn't affect the deployed app. Recommendation: leave as-is, watch
for a Prisma patch release that fixes it without the downgrade.

## 7. No security headers — Low

Nothing in `next.config.ts` sets `Content-Security-Policy`,
`X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, etc. Not urgent
pre-launch, but cheap to add via Next's `headers()` config once the app
has a real deployment target.

## 8. Unvalidated `imageUrl` in `CardGrid` — Low

**File:** [src/components/blocks/CardGrid.tsx:18](../src/components/blocks/CardGrid.tsx#L18)

`<img src={card.imageUrl}>` renders whatever URL is stored in block data
with no allow-list. Browsers don't execute `javascript:` URIs from `img
src`, so this isn't XSS today, but it's worth an allow-list (or routing
through `next/image`, which also gets you validation + optimization) once
non-privileged users can influence this data (e.g. Collections system,
or if `EDITOR`/`VIEWER` ever get scoped-down but still-real write access
per finding #2).

## Confirmed *not* vulnerable (checked, worth stating explicitly)

- **SQL injection**: no raw `$queryRaw`/`$executeRaw` anywhere — every
  query goes through Prisma's parameterized query builder.
- **XSS via rendering**: no `dangerouslySetInnerHTML`, `eval`, or
  `new Function` anywhere in `src/`; React escapes all text content by
  default.
- **Secrets in git**: `.env` was never committed (`.gitignore` covers
  it, confirmed via `git ls-files`); only `.env.example` (no real values)
  is tracked.
- **Password storage**: hashed with `bcryptjs` (cost factor 10) before
  storage; the `authorize()` callback returns only `id`/`name`/`email`/
  `role`, never the hash, to the session.
- **Open redirect**: the login page redirects to a fixed `/admin`, never
  a user-controlled URL.

---

*Findings #1 and #2 are the ones worth fixing before doing anything else
— they mean the `Role` model this app is built around isn't actually
providing any protection yet.*
