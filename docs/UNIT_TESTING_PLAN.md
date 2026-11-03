# Unit Testing (Vitest) — Design Plan

Goal: fast unit, component and database-integration tests with Vitest,
so new logic in this repo can be written test-first, alongside the
existing Playwright suite.

**Status: phase 1 (setup + unit project) done. Phases 2-4 not started.**

Phase 1: 30 unit tests across `src/collections/` (validation, form
parsing, serialization) and `src/lib/` (API envelope, `clientIp`), run
by `npm run test` locally and in the CI `checks` job. The
`documentToJson` bug from §6 was fixed test-first: the new test failed
with `id: "spoofed"`, then passed after moving the `...data` spread
first. One change from the design: Vite 8 (under Vitest 5) resolves the
`@/*` alias itself with `resolve.tsconfigPaths: true`, so
`vite-tsconfig-paths` isn't used (§1, §3).

## The core distinction: what Vitest is for vs what Playwright is for

Playwright ([E2E_TESTING_PLAN.md](E2E_TESTING_PLAN.md)) drives a real
production build in a browser. It's the right tool for "does the admin
work end to end", but each run builds the app and takes minutes, and a
failure points at a whole flow, not the function that broke. That makes
it unusable as the inner loop of test-driven development.

Vitest covers the layer below: one function or component at a time, in
milliseconds, in watch mode. The split:

| Layer                          | Tool                   | Examples                                        |
| ------------------------------ | ---------------------- | ----------------------------------------------- |
| Pure logic                     | Vitest `unit`          | Zod schema builder, form parsing, `clientIp`    |
| Rendering of sync components   | Vitest `components`    | `Hero`, `CardGrid`, `BlockRenderer`, login form |
| Logic whose correctness is SQL | Vitest `integration`   | rate limiter upsert, RBAC permission lookups    |
| Whole flows, auth, real pages  | Playwright (unchanged) | login, CRUD, RBAC in the UI, visual baselines   |

**Decided: DB-backed code runs against a real test database, not a
mocked Prisma client.** The rate limiter's whole point is one atomic
raw-SQL statement, and RBAC is a relational query. A mocked client
would only check that the code calls Prisma the way the test expects,
not that the query does the right thing. Pure-logic and component tests
never touch a database, so the fast loop doesn't need Postgres running.

**Decided: component tests are included from the start** (jsdom +
Testing Library). Vitest can't render `async` Server Components (per
Next's own Vitest guide), so those, and every admin page, stay
Playwright's job.

## How this relates to what already exists

- **Playwright**: unchanged. `npm run e2e` / `e2e:visual` keep their
  scripts, config and CI steps. Vitest only looks under `src/`, so the
  two never pick up each other's files.
- **Verification standard (CLAUDE.md)**: today DB-touching logic is
  checked with a throwaway script, then deleted (e.g. the rate limiter's
  50-concurrent-calls check in RATE_LIMIT_PLAN.md phase 1). Where that
  check is a property of a function, it becomes a permanent
  `integration` test instead. Hitting the real route/action against
  real data is still required for features as a whole.
- **CI**: the `checks` job gains `npm run test` (no database needed).
  The `e2e` job, which already has a Postgres service, gains
  `npm run test:int`.
- **Turborepo**: new `test` task, so root `npm run test` fans out like
  `lint` / `typecheck`. `apps/my-portfolio` gets no tests in this plan
  (Open questions).

## 1. Packages (devDependencies of `apps/cms`)

`vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`,
`@testing-library/dom`, `@testing-library/user-event`,
`@testing-library/jest-dom` (`toBeInTheDocument()` etc.).

That's the set Next's bundled guide
(`node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`)
lists, plus `user-event` and `jest-dom`, minus `vite-tsconfig-paths`:
Vite 8 resolves `tsconfig.json` paths natively (`resolve.tsconfigPaths`).

## 2. Layout and naming

Tests are **colocated** with the code they test:

```
src/lib/rate-limit.ts
src/lib/rate-limit.test.ts        ← unit (clientIp)
src/lib/rate-limit.int.test.ts    ← integration (consume, pruneExpired)
src/components/blocks/Hero.tsx
src/components/blocks/Hero.test.tsx  ← components
```

The suffix picks the project, so a file never needs a config entry:

| Suffix          | Project       | Environment | Database |
| --------------- | ------------- | ----------- | -------- |
| `*.test.ts`     | `unit`        | node        | never    |
| `*.test.tsx`    | `components`  | jsdom       | never    |
| `*.int.test.ts` | `integration` | node        | test DB  |

Colocated `*.test.ts` files under `src/app/` don't become routes (only
`page`/`route`/etc. are special), so the convention holds everywhere.

## 3. `apps/cms/vitest.config.mts`

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.int.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "components",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./vitest.setup.components.ts"], // jest-dom + cleanup
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["src/**/*.int.test.ts"],
          globalSetup: ["./vitest.setup.integration.ts"],
          fileParallelism: false, // files share tables
        },
      },
    ],
  },
});
```

`globals` stays off: tests import `describe`/`it`/`expect` from
`vitest`, so ESLint and TypeScript need no extra config.

## 4. The integration database: safety first

`src/lib/prisma.ts` connects to whatever `DATABASE_URL` says, and the
local `.env` points at the **dev** database (`custom_cms`). Vitest
doesn't load `.env` into `process.env`, but a developer's shell might
have it exported. So `vitest.setup.integration.ts` refuses to run
unless the URL's database name ends in `_test`:

```ts
export default function setup() {
  const url = process.env.DATABASE_URL;
  const name = url && new URL(url).pathname.slice(1);
  if (!name?.endsWith("_test")) {
    throw new Error(
      `Integration tests need DATABASE_URL pointing at a *_test database (got "${name ?? "unset"}").`,
    );
  }
}
```

- **Locally**: the same `custom_cms_test` database the e2e suite uses,
  e.g. `DATABASE_URL=postgresql://.../custom_cms_test npm run test:int`.
  Documented in INSTALLATION.md.
- **CI**: the `e2e` job's existing service container. `test:int` runs
  right after `prisma migrate deploy` and **before** `db:seed`, so
  nothing it does can leak into the seed-only data the visual specs
  screenshot.
- **Isolation**: each test creates its own rows with unique keys/slugs
  (`randomUUID()`) and deletes them in `afterEach`, the same pattern as
  e2e's random IPs. No truncating shared tables: the local test DB is
  also the e2e DB.
- **Auth in integration tests**: `requirePermission` and
  `requireCollectionAccess` call `auth()`. Those tests
  `vi.mock("@/lib/auth")` to return a chosen session; the permission
  lookup behind it stays real. Real login stays Playwright's job.

## 5. Scripts

`apps/cms/package.json`:

```json
"test": "vitest run --project unit --project components",
"test:watch": "vitest --project unit --project components",
"test:int": "vitest run --project integration"
```

`npm run test` is the fast default, with no database needed. Root
`package.json` gets `"test": "turbo run test"`, and `turbo.json` gets a
cached `test` task plus an uncached `test:int` with `DATABASE_URL` in
its `env`.

## 6. First tests (what each phase covers)

**Unit** (`*.test.ts`):

- `collectionToZod` (`src/collections/validation.ts`): required vs
  optional, min/max length and value, `select` options (single and
  `many`), `blocks.allow`, nested `array` fields.
- `parseDocumentFormData` (`src/collections/formData.ts`): coercion per
  field type, empty strings become absent, checkbox `"on"`, multi-line
  relationship ids, invalid JSON error message.
- `documentToJson` (`src/collections/serialize.ts`): `data` flattened,
  and `slug`/`status`/timestamps win over same-named keys in `data`.
  `id` currently doesn't: it's spread _before_ `data`, so a collection
  field named `id` would replace the document's id in API responses.
  Likely a bug; phase 1 settles it test-first (failing test, then fix).
- `apiSuccess` / `apiError` (`src/lib/api-response.ts`): envelope shape
  and status.
- `clientIp` (`src/lib/rate-limit.ts`): first `x-forwarded-for` entry,
  `x-real-ip` fallback, `"unknown"`.

**Components** (`*.test.tsx`):

- `Hero`, `CardGrid`: optional parts render only when given.
- `BlockRenderer`: maps keys through the registry, skips and warns on
  an unknown key.
- Login page (`src/app/login/page.tsx`): with `next-auth/react` and
  `next/navigation` mocked, a `rate_limited` result shows the rate-limit
  message, any other error shows "Invalid email or password.", and
  success pushes `/admin`.

**Integration** (`*.int.test.ts`):

- `consume`: 50 concurrent calls give exactly `count = 50` and exactly
  `limit` allowed (the phase 1 throwaway check, made permanent); window
  rollover with `vi.setSystemTime`; `resetAt` on the UTC boundary.
- `pruneExpired`: removes a two-day-old row, keeps the current one.
- `hasPermission` / `requirePermission`: granted, not granted, no
  roles, no session.
- `hasCollectionAccess` / `hasReadAccess`: OR across keys, `"public"`
  read, and failing closed when no keys are configured.

## 7. The test-first rule (CLAUDE.md)

New section in CLAUDE.md, landed in phase 1:

- **New or changed logic in `src/lib/` and `src/collections/` is
  written test-first**: write the failing Vitest test, then the code.
- **Every bug fix starts with a failing test** that reproduces it, at
  the lowest layer that can (unit before integration before Playwright).
- UI-only and page-level changes keep relying on Playwright; component
  tests are welcome but not required.
- `npm run test` joins the "Before committing, always run" list.

## 8. Phased build order

1. **Setup + unit project**: packages, `vitest.config.mts` with only
   the `unit` project, `test`/`test:watch` scripts, the Turbo task, the
   CI `checks` step, the unit tests in §6, and the CLAUDE.md rule (§7).
   Useful on its own: TDD works for pure logic from here.
2. **Components project**: jsdom, Testing Library, the setup file, and
   the component tests in §6.
3. **Integration project**: the `_test` guard, `test:int`, the CI step
   in the `e2e` job before seeding, the integration tests in §6, and
   the INSTALLATION.md note on running them locally.
4. **Docs**: E2E_TESTING_PLAN.md points at this plan for the layer
   below, PROJECT_PLAN.md marks this done, and a Known gotchas entry
   for anything hit along the way.

## Open questions

- **Coverage reports** (`@vitest/coverage-v8`): useful once there's a
  real body of tests. Not a gate for now; a threshold set on day one
  would only measure how few tests exist.
- **`apps/my-portfolio`**: it has its own components and a CMS fetch
  layer worth testing. Same config pattern, separate plan once it has
  logic beyond placeholders.
- **Server actions** (`src/app/admin/**/actions.ts`): testable as
  integration tests with `auth()` mocked, but they also call
  `revalidatePath`/`redirect`, which need Next's request context.
  Revisit when the first action-level bug shows up; Playwright covers
  them today.
