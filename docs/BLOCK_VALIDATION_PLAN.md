# Block Data Validation — Design Plan

Goal: every block written to the database has `data` that matches its
component's JSON Schema, has no props the schema doesn't declare, and is
under a size cap. Closes [SECURITY_REVIEW.md](SECURITY_REVIEW.md)
finding #3.

**Status: phases 1 (validator) and 2 (pages) done. Phases 3-4 not
started.**

Phase 2: `assertValidBlock` (by component id or key) runs in `addBlock`
before the insert. Test-first at both layers: three integration tests
against a throwaway `Component` failed with the function missing, and
the new Playwright test (Hero data with no `heading` and an `onClick`)
failed against a local production build because the block was saved.
After the change both pass, and the full functional suite passes
locally (19 passed, 1 skipped, with `--workers=2`: at the default 8
workers, logins on this machine timed out before redirecting, unrelated
to this change).

Phase 1: `closeSchema` and `validateBlockData` in
`src/lib/block-validation.ts`, with 12 unit tests written first
against the seeded Hero and Card Grid schemas. As a mutation check,
compiling without `closeSchema` made exactly the two unknown-property
tests fail. Errors are sorted so `allErrors` output has a stable order.
Note: a plain `npm install ajv` in this workspace resolved to Ajv 6
(already in the tree via ESLint), so the dependency is pinned to
`^8.20.0`.

## The problem, concretely

Every `Component` row carries a `schema` (JSON Schema, seeded in
`prisma/seed.ts`), but nothing ever checks data against it:

- **Pages:** `addBlock` (`src/app/admin/pages/actions.ts`) only checks
  that `data` is valid JSON, then stores it. Any size, any shape.
- **Collections:** a `blocks` field (`src/collections/validation.ts`)
  validates `{ component, data }` items, but `data` is `z.unknown()`, and
  with no `allow` list `component` can be any string, even a key that
  matches no component.

Block data is spread straight into the component's props
(`BlockRenderer`: `<Component {...block.data} />`), and the public page
(`src/app/[slug]/page.tsx`) renders it. Bad data written once breaks the
public page for everyone. For example, `{"cards": "x"}` for `card-grid`
crashes on `cards.map`. It also lets an editor store an unbounded
payload in Postgres.

## Decisions

- **Validator: Ajv**, the reference JSON Schema validator. Zod 4's
  `z.fromJSONSchema` also handled the seeded schemas in a quick test,
  but Zod's own docs call it "semi-experimental, behavior liable to
  change", which is the wrong base for a security check. Ajv is a
  server-only dependency.
- **One shared validator for both paths** (pages and collection `blocks`
  fields), so the two can't drift apart, the same reasoning as
  `src/collections/access.ts`.
- **Schemas are treated as closed:** a key the schema doesn't declare is
  an error, at every nesting level, unless a schema explicitly says
  otherwise. The schema is the list of props the component accepts.
  Anything else reaching `{...block.data}` is at best ignored and at
  worst a prop the component didn't expect.
- **Size cap: 64 KB** of serialized JSON per block. The seeded blocks
  are well under 1 KB; a hero or a card grid with a few dozen cards is
  far below the cap. It's a constant, cheap to change.
- **Existing rows are not rewritten.** Validation runs on write. Phase 4
  audits existing data (read-only) and reports anything that would now
  fail.

## How this relates to what already exists

- `Component` and `Block` models: unchanged. No migration.
- `prisma/seed.ts` schemas: unchanged. Closing happens in the validator
  (§2), so production's existing component rows get it too without a
  data migration (seed upserts use `update: {}` and never rewrite them).
- `collectionToZod`: keeps validating the `{ component, data }` shape and
  `allow`. Checking `data` against a component needs a database lookup,
  which a synchronous Zod schema can't do, so it's a second async step
  in `parseDocumentData` (`src/collections/actions.ts`), the same place
  `assertUniqueFields` already does its database check.
- Admin UI: no changes. Errors are thrown from the server action like
  every existing validation error ("Block data must be valid JSON").
- Tests follow the test-first rule (CLAUDE.md): unit tests for the pure
  parts, integration tests for anything that loads a `Component`.

## 1. `src/lib/block-validation.ts`

```ts
export const MAX_BLOCK_DATA_BYTES = 64 * 1024;

export type BlockValidationResult =
  { ok: true } | { ok: false; message: string };

/** Pure: checks size, then `data` against the (closed) schema. */
export function validateBlockData(
  schema: unknown,
  data: unknown,
): BlockValidationResult;

/**
 * Loads the component (by id or key) and validates `data` against its
 * schema. Throws `Error` with a readable message on any failure,
 * including an unknown component.
 */
export async function assertValidBlock(
  component: { id: string } | { key: string },
  data: unknown,
): Promise<void>;
```

- Size: `Buffer.byteLength(JSON.stringify(data))` compared before
  running the schema, so an oversized payload costs no validation work.
- Ajv instance: `new Ajv({ allErrors: true, strict: true })`. Strict mode
  rejects a schema with unknown keywords, so a typo in a seeded schema
  fails loudly instead of silently validating nothing.
- Compiled validators are cached by the schema's JSON string. Compiling
  is the expensive part, and component schemas almost never change.
- Error messages match the collection errors' `path: message` shape,
  e.g. `Invalid data for "card-grid": cards.0.title: must be string`.
  Ajv's `instancePath` (`/cards/0/title`) becomes `cards.0.title`; an
  unknown key reads `foo: is not an allowed property`.

## 2. Closing schemas

```ts
/** Returns a copy where every object schema without its own
 * `additionalProperties` gets `additionalProperties: false`. */
export function closeSchema(schema: unknown): unknown;
```

Walks `properties`, `items`, and the combinators (`allOf`, `anyOf`,
`oneOf`) recursively. A schema that sets `additionalProperties` itself
(`true` or a sub-schema) keeps it, so a future component that genuinely
wants free-form props can opt out explicitly. Pure, so it's unit-tested
on its own.

## 3. Where it's called

- **`addBlock`:** after `JSON.parse`, `await assertValidBlock({ id:
componentId }, data)` before the `Block` insert. That also gives a
  readable error for a nonexistent `componentId` instead of a foreign
  key failure.
- **Collections:** `parseDocumentData` becomes async and, after Zod,
  walks the config for `blocks` fields (including inside `array` fields)
  and calls `assertValidBlock({ key: item.component }, item.data)` for
  each item. That also closes the "any component string" gap when
  `allow` is omitted.

## 4. Tests

**Unit** (`src/lib/block-validation.test.ts`, test-first):

- `closeSchema`: top-level, nested object, array items, combinators, and
  an explicit `additionalProperties` left alone.
- `validateBlockData` with the seeded Hero and Card Grid schemas: valid
  data passes; a missing required prop, a wrong type, an unknown key
  (top-level and inside a card) and a payload over 64 KB each fail with
  the expected message.
- An invalid schema (unknown keyword) fails rather than validating
  nothing.

**Integration** (`*.int.test.ts`, test database):

- `assertValidBlock` by id and by key against throwaway `Component`
  rows, plus an unknown id/key.
- Collection create/update with a `blocks` field: bad block data and an
  unknown component key are both rejected. This calls
  `parseDocumentData`, not the server action, to avoid needing Next's
  request context (UNIT_TESTING_PLAN.md Open questions).

**Playwright:** one functional test that adding a Hero block with
invalid data shows the error and creates no block, so the server action
wiring is covered end to end.

## 5. Phased build order

1. **Validator:** add Ajv, `closeSchema`, `validateBlockData` and their
   unit tests. No behavior change yet.
2. **Pages:** `assertValidBlock`, wired into `addBlock`, with its
   integration tests and the Playwright test.
3. **Collections:** the async `blocks` check in `parseDocumentData`,
   with its integration tests.
4. **Audit + docs:** a throwaway read-only script runs every existing
   `Block` and collection block through `validateBlockData` against the
   local dev database, and the results go here (then the script is
   deleted). Mark SECURITY_REVIEW #3 fixed and update PROJECT_PLAN.md.

## Open questions

- **Rendering existing bad data:** validation only protects new writes.
  If the audit finds bad rows, the options are fixing the data or
  having `BlockRenderer` skip a block whose data fails validation, at a
  per-request cost. Decide once the audit says whether it matters.
- **Production audit:** phase 4 runs against the local dev database.
  Auditing production needs its connection string; worth doing once
  before marking #3 fixed if production has hand-entered pages.
- **Editing and reordering blocks:** only `addBlock` writes block data
  today. Any future "edit block" action must call `assertValidBlock`
  too.
- **Admin-managed components:** components only come from the seed
  today. If an admin UI for them is ever built, it should compile the
  schema with Ajv on save, so a broken schema is rejected there rather
  than at the first block write.
- **Validation errors are invisible in production.** A rejected block
  (like every other error thrown from an admin server action, e.g.
  "Block data must be valid JSON") shows Next's generic "This page
  couldn't load. A server error occurred." screen with an error digest,
  because production builds strip thrown messages. Data is protected,
  but the editor isn't told what was wrong. Fixing that means returning
  errors from the actions (`useActionState`) instead of throwing, across
  all admin forms: a separate change.
