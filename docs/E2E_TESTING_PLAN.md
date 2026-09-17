# E2E & Visual Regression Testing — Design Plan

Goal: real, automated coverage — Playwright driving the actual app
against a real (ephemeral) Postgres database, plus visual regression
screenshots — replacing the current "verify by hand every time" habit
this project has relied on so far.

**Status: design only, nothing in this doc is implemented yet.**

See [PROJECT_PLAN.md](PROJECT_PLAN.md) §4 ("No automated tests" — the
gap this closes) and [ADMIN_THEME_PLAN.md](ADMIN_THEME_PLAN.md) (the
in-progress work whose phases this test plan tracks for visual
coverage).

## Why this needs a real database, and why CI doesn't have one today

`.github/workflows/ci.yml` today sets `DATABASE_URL` to a fake
connection string that's never actually dialed — `prisma generate`
only reads `schema.prisma`, and `lint`/`typecheck`/`format:check` never
touch a database at all. That's fine for those three checks but not
for e2e: logging in as the seeded admin/editor/viewer and exercising
real RBAC-gated Server Actions means the app needs a real, running
Postgres to talk to. CI gets a genuine (ephemeral, thrown away after
the run) Postgres via a GitHub Actions service container — see §4.

## Why baselines can't be captured on a Windows dev machine

Playwright's `toHaveScreenshot()` visual regression does pixel
comparison, and font hinting/anti-aliasing differs enough between
Windows and Linux that a screenshot taken on a Windows dev machine will
never match one taken in CI (Linux runners) — every visual test would
fail on the first CI run despite nothing actually being wrong. Baseline
PNGs must always be generated somewhere Linux-based: either in a CI job
itself (a "update snapshots" workflow, committed back via a normal PR)
or locally via the official `mcr.microsoft.com/playwright` Docker
image. **Never** run `playwright test --update-snapshots` directly on a
Windows dev machine and commit the result.

## How this relates to what already exists

- New, additive — doesn't replace `docs/SEEDING.md`'s seed script,
  reuses it as-is (already idempotent, already reads
  `SEED_USER_PASSWORD` from the environment — exactly what a CI-seeded
  test database needs).
- Runs as a **new, separate CI job** alongside (not replacing) the
  existing `checks` job in `.github/workflows/ci.yml` — format/lint/
  typecheck stay fast and DB-free; e2e is slower and gets its own job
  so a flaky/slow e2e run doesn't block the fast feedback of the
  others (both still gate merge).
- Tracks [ADMIN_THEME_PLAN.md](ADMIN_THEME_PLAN.md) phase-by-phase:
  each theme phase that lands adds (or updates) the e2e/visual test for
  the page(s) it touches, so coverage grows with the migration instead
  of needing a separate catch-up pass at the end.

## 1. Dependencies & config

```
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

Chromium only, for now — one browser keeps CI time and the visual
baseline set small; see Open Questions for adding more later.

`apps/cms/playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:4001",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run start",
    url: "http://localhost:4001",
    reuseExistingServer: !process.env.CI,
  },
});
```

`webServer` builds on the existing `npm run build && npm run start`
scripts already in `apps/cms/package.json` — tests run against a real
production build, not `next dev`, so what's tested matches what
actually deploys.

## 2. Test data strategy

- **CI**: a Postgres service container (see §4) is migrated
  (`prisma migrate deploy`) and seeded (`npm run db:seed`) once before
  the test run, using a `SEED_USER_PASSWORD` GitHub Actions secret —
  never the `changeme123` local fallback. The container is destroyed
  when the job ends, so there's no real persistence/cleanup concern
  between runs.
- **Local**: point `DATABASE_URL` at a dedicated local test database
  (e.g. `custom_cms_test`, a second local Postgres DB alongside the
  normal dev one), migrated and seeded the same way, **not** the
  database used for manual dev/testing — e2e tests do real writes
  (creating pages, uploading media, deleting things), and running them
  against your working dev data would clobber it.

## 3. File layout

```
apps/cms/
  playwright.config.ts
  e2e/
    fixtures.ts       # login-as-{admin,editor,viewer} helpers, reused across specs
    auth.spec.ts       # login/logout, session gating on /admin/*
    rbac.spec.ts        # write actions rejected for viewer, allowed for editor/admin
    pages.spec.ts        # create/edit/publish a Page end-to-end
    media.spec.ts         # upload + delete
    visual/
      login.spec.ts        # toHaveScreenshot() coverage, added per theme phase
      admin-shell.spec.ts
      ...
```

Functional (`auth`/`rbac`/`pages`/`media`) and visual specs are kept in
separate files/folders since they have different failure modes — a
functional test failing means something is actually broken; a visual
test failing might just mean an intentional redesign needs new
baselines. Keeping them separate makes CI failures easier to triage at
a glance.

## 4. CI integration

New job in `.github/workflows/ci.yml`, alongside the existing `checks`
job:

```yaml
e2e:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:16
      env:
        POSTGRES_USER: test
        POSTGRES_PASSWORD: test
        POSTGRES_DB: custom_cms_test
      ports: ["5432:5432"]
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
  env:
    DATABASE_URL: "postgresql://test:test@localhost:5432/custom_cms_test"
    AUTH_SECRET: "ci-test-secret-do-not-use-in-prod"
    SEED_USER_PASSWORD: ${{ secrets.SEED_USER_PASSWORD }}
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 24, cache: npm }
    - run: npm install
    - run: npx prisma generate
      working-directory: apps/cms
    - run: npx prisma migrate deploy
      working-directory: apps/cms
    - run: npm run db:seed
      working-directory: apps/cms
    - run: npx playwright install --with-deps chromium
      working-directory: apps/cms
    - run: npm run build
      working-directory: apps/cms
    - run: npx playwright test
      working-directory: apps/cms
```

`turbo.json` gets a matching `"e2e": {}` task and `apps/cms/package.json`
gets `"e2e": "playwright test"`, mirroring how `lint`/`typecheck`
already fan out through Turborepo.

**Updating visual baselines** (per ADMIN_THEME_PLAN phase, or any
intentional redesign): a manually-triggered `workflow_dispatch` job
(or the Playwright Docker image run locally) that runs
`playwright test --update-snapshots` and opens/updates a PR with the
new baseline PNGs — never done ad hoc from a Windows machine, per the
constraint above.

## 5. Phased initial scope

Ordered to give functional (non-visual) coverage first — since that's
valuable immediately, regardless of the theme rollout — then visual
coverage lands alongside each `ADMIN_THEME_PLAN.md` phase as it ships:

1. **Infrastructure** — Playwright installed, config, CI job wired up,
   one trivial smoke spec (e.g. the public homepage loads) to prove the
   pipeline works end-to-end before writing real coverage.
2. **Auth & RBAC smoke suite** — login/logout, `/admin/*` redirect when
   logged out, a write action succeeding for admin/editor and rejected
   (real 403/error, not just a hidden button) for viewer. This is
   today's single highest-value gap: RBAC has already had one real
   Critical-severity bug (`docs/SECURITY_REVIEW.md`), and this is
   exactly the kind of regression automated coverage should catch
   going forward.
3. **Pages & Media CRUD** — create/edit/publish a Page, upload/delete
   Media, against the real Server Actions.
4. **Visual: Login page** — lands together with `ADMIN_THEME_PLAN.md`
   phase 2.
5. **Visual: Admin shell** — lands together with `ADMIN_THEME_PLAN.md`
   phase 3.
6. **Visual: Roles/Users, Media, Pages admin** — lands together with
   the corresponding `ADMIN_THEME_PLAN.md` phases 4–6.

## Open questions

- **Cross-browser coverage**: Chromium-only to start. Worth adding
  Firefox/WebKit once the suite is stable, or is Chromium-only an
  acceptable permanent tradeoff for this project's size? Not decided.
- **Accessibility checks**: Playwright pairs well with
  `@axe-core/playwright` for automated a11y assertions — natural to
  add during the theme rollout (each new component is a good place to
  assert this), but out of scope for this plan's first phase.
- **Baseline update job**: `workflow_dispatch` UI trigger vs. a PR-comment
  slash command (e.g. `/update-snapshots`) vs. always-local-via-Docker.
  Leaning `workflow_dispatch` for simplicity; revisit if it proves
  annoying in practice.
