# Monorepo — Multi-Site Architecture

**Status: design only, nothing implemented yet.**

Goal: turn this repo into a monorepo holding the CMS (unchanged in
purpose) plus one or more separate frontend "site" apps, each its own
deployable app on its own domain/subdomain, all pulling content from
the one shared CMS.

Decisions locked in (via direct discussion, not left open):

- **Separate frontend apps, not a multi-tenant single app.** Each site
  is its own small app with its own design/tech, fetching content from
  the CMS's existing REST API (`/api/v1/pages`, `/api/v1/posts`) —
  exactly what that API was already built for. The CMS stays the one
  source of truth for content and the only thing with a database
  connection; sites are thin, read-only consumers.
- **Turborepo** orchestrates local dev and (eventually) builds — a
  single `npm run dev` from the repo root starts every app's dev
  server in parallel, each on its own port, in one terminal.
- **Port convention**: CMS dev server is `4001` (not Next.js's default
  3000 — deliberate, so it never collides with a site app that happens
  to grab 3000 first). Sites increment from `4002`.

## How this relates to what already exists

Nothing about the CMS itself changes functionally — same Prisma schema,
same admin, same REST API, same RBAC. What changes is _where it lives_
in the repo (moves into `apps/cms/`) and _what else exists alongside
it_ (new `apps/<site-name>/` folders). The REST API's read-only,
published-only-content design (see `PROJECT_PLAN.md` §6) was already
built anticipating "a separate frontend" — this is that plan actually
being exercised, just with the option of _multiple_ separate frontends
instead of one hypothetical one.

## 1. Folder structure

```
custom-cms/                    <- repo root
├── apps/
│   ├── cms/                   <- today's entire app, moved here as-is
│   │   ├── src/
│   │   ├── prisma/
│   │   ├── package.json       <- "dev": "next dev -p 4001"
│   │   └── ...
│   └── <site-name>/            <- first new frontend site (name TBD - open question)
│       ├── src/
│       ├── package.json       <- "dev": "next dev -p 4002"
│       └── ...
├── package.json                <- root: workspaces + turbo scripts only
├── turbo.json                  <- defines the dev/build/lint/typecheck pipeline
└── docs/                       <- stays at repo root, covers the whole monorepo
```

`docs/`, `.github/workflows/`, `.claude/skills/`, and root-level config
(`.gitignore`, `CLAUDE.md`) stay at the repo root — they're monorepo-wide
concerns, not per-app.

## 2. Root-level config

```json
// package.json (root)
{
  "private": true,
  "workspaces": ["apps/*"],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "devDependencies": {
    "turbo": "latest"
  }
}
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": { "cache": false, "persistent": true },
    "build": { "dependsOn": ["^build"], "outputs": [".next/**"] },
    "lint": {},
    "typecheck": {}
  }
}
```

Each app's own `package.json` keeps its own `dev`/`build`/`lint`/
`typecheck` scripts (unchanged from what `apps/cms` already has today)
— Turborepo just fans the root command out to every app that defines
that script. Running `npm run lint` at the root now checks every app;
running it inside `apps/cms/` still checks just that one, same as today.

Formatting stays a single repo-wide Prettier pass at the root (not
per-app) — one style across the whole monorepo, docs included.

## 3. Migration plan (moving the existing app)

This is a structural move of a live, deployed app — needs care, in this
order:

1. Create `apps/cms/`, `git mv` every existing app file into it
   (`src/`, `prisma/`, `next.config.ts`, `package.json`, etc.) —
   preserves git history per file rather than appearing as delete+add.
2. Add the root `package.json`/`turbo.json` from §2.
3. Update `apps/cms/package.json`'s `dev` script to `next dev -p 4001`.
4. Update `.github/workflows/ci.yml`: install/generate/build/check
   steps need to run against the workspace, not assume repo-root
   `package.json` scripts map directly to the app (either `cd apps/cms`
   per step, or rely on the root `turbo lint`/`turbo typecheck` fan-out
   from §2 — prefer the latter, it's what Turborepo is for).
5. **Update Vercel's existing project**: Settings → General → **Root
   Directory** → change from `.` (repo root) to `apps/cms`. Without
   this, the next deploy fails immediately (Vercel would look for
   `package.json` at the repo root and find the new monorepo-level one
   instead, which has no `build` script that produces a Next.js app).
6. Verify: `npm install` at the root, `npm run dev` starts `cms` on
   `:4001` and behaves identically to before, `npm run build` succeeds,
   push to a branch and confirm CI + the Vercel preview deploy both
   still work before merging.

No database, schema, or environment variable changes — this phase is
a pure structural move, verified by "everything works exactly the same,
just from a new path."

## 4. Adding a new site

Once the migration above is done and verified:

1. `apps/<site-name>/` — a fresh, minimal Next.js app (own
   `create-next-app` scaffold, same conventions as `apps/cms` where
   they apply: TypeScript, Tailwind if wanted, its own `package.json`
   with `"dev": "next dev -p 4002"`).
2. Fetch content from the CMS via **Server Components**, not
   client-side `fetch` — e.g. `fetch("http://localhost:4001/api/v1/pages/<slug>")`
   inside a Server Component, same pattern already used throughout
   `apps/cms` itself. This matters for a real reason, not just
   consistency: a server-to-server request has no CORS concerns at all
   (CORS is a browser enforcement mechanism); a client-side `fetch`
   from the site's own domain to the CMS's domain would hit CORS
   immediately, since the CMS's API sets no CORS headers today and
   isn't planned to. Keep all content-fetching server-side and this
   never becomes a problem.
3. In production, the CMS's URL isn't `localhost:4001` — it's whatever
   the CMS's real deployed domain is. Each site needs an env var (e.g.
   `CMS_API_URL`) rather than a hardcoded `localhost` URL, set
   differently per environment (local: `http://localhost:4001`,
   production: the real CMS domain).
4. **New, separate Vercel project** for the site, root directory
   `apps/<site-name>`, its own domain/subdomain. Not part of the CMS's
   existing Vercel project — a genuinely separate deployable app, same
   relationship the CMS has to any external consumer of its API.

## 5. What's explicitly NOT changing

- The CMS's data model, admin UI, RBAC, and REST API are untouched by
  this plan — this is purely about repo/deployment structure.
- No shared code package between apps yet (e.g. a typed API client) —
  each site hand-writes its own `fetch` calls against the documented
  REST API shape to start. Worth revisiting only if duplication across
  2+ real sites actually becomes painful (see open questions).

## Phased build order

1. Migration (§3) — move `apps/cms`, set up Turborepo, fix CI + Vercel
   root directory, verify nothing broke. Land and merge this alone
   before building any new site, so a broken migration doesn't get
   tangled up with new-site work in the same review.
2. Scaffold the first real site (§4) as a minimal proof: one page,
   fetching one real piece of content from the CMS's API, deployed to
   its own Vercel project and domain. Prove the whole path end-to-end
   before building it out further.
3. Iterate on that first site's actual content/design, and/or add
   additional sites following the same §4 pattern.
4. Only then, if warranted: a shared API-client package (open question
   below).

## Open questions

- **What is the first site actually for, and what should it be
  named?** `<site-name>` above is a placeholder — need a real answer
  before step 2 of the build order starts. (Marketing site? Blog?
  Something else entirely?)
- **Should the REST API ever need auth for these sites** (e.g. to
  preview draft content, not just published), or is published-only
  public access sufficient for every site indefinitely? Ties into the
  `ApiKey` model floated in `PROJECT_PLAN.md` §6 but not built — no
  need to resolve this now, only if/when a site genuinely needs draft
  previews.
- **Shared API-client package** — worth it once there are 2+ sites
  duplicating the same `fetch` + response-shape logic, not before.
  Revisit after the first site is real.
