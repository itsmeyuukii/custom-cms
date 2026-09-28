# Collections System — Design Plan

Goal: a Payload-style config-driven content system, built on our own stack
(Next.js + Prisma + Postgres), so adding a new content type is "write a
config object" instead of "write a Prisma model + migration + admin pages

- API route" by hand every time.

**Status: phases 1-6 (config shape, `Document` model, Zod validator
generator, generic server actions, generic admin UI, Posts migrated to be
the first real collection) done — see §4. Phase 7 not started.**

Decisions locked in (see [PROJECT_PLAN.md](PROJECT_PLAN.md) for the rest of
the project's decisions):

- Storage: a single generic `Document` table holding JSONB, not
  per-collection Prisma models. Trades real foreign-key relations for
  "adding a collection needs zero migrations."
- Build order: nail the collection/field config shape first, before
  touching the admin UI or an API layer.

## How this relates to what already exists

We're **not** replacing `Page` + `Component` + `Block` — that system
already does one thing well: composing a page out of reusable, positioned
blocks (Hero, Card Grid, etc.), and it maps cleanly onto Payload's
"Blocks" field type. It stays as-is.

What's missing is everything _else_ — Posts, and any future content type
(team members, products, FAQs...) — each of which would otherwise need
its own hand-written Prisma model + migration + admin pages, exactly like
`Page` did. The Collections system replaces that hand-written path.
**Posts is now the first real collection** (phase 6) — proof that the
system works, and it finally has a create UI.

`Media` stays a real Prisma model too (it's referenced by file storage
concerns, not really "content").

## 1. Storage: the `Document` model

Add to `prisma/schema.prisma`:

```prisma
model Document {
  id         String        @id @default(cuid())
  collection String        // config slug, e.g. "posts"
  slug       String?       // only set if the collection has a slug-like field
  status     ContentStatus @default(DRAFT)
  data       Json          // the actual field values, shaped by the collection's field config
  authorId   String?
  author     User?         @relation(fields: [authorId], references: [id])
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt

  @@unique([collection, slug])
  @@index([collection, status])
}
```

`data` is schemaless at the database level — Postgres doesn't know or
enforce what's inside it. All shape/validation enforcement happens in
application code, against the collection's field config, before any
write. This is the direct cost of choosing JSONB over generated models.

## 2. Collection & field config shape

This is the core design surface — everything else (admin forms, API
validation) reads this shape, so it needs to be right before anything is
built on top of it.

```ts
// src/collections/types.ts

export type FieldType =
  | "text"
  | "textarea"
  | "richText"
  | "number"
  | "boolean"
  | "date"
  | "select"
  | "relationship"
  | "upload"
  | "array"
  | "blocks"; // reuses the existing Component/Block registry

interface BaseField {
  name: string; // key inside `data`
  label?: string; // defaults to a title-cased `name`
  required?: boolean;
  unique?: boolean; // enforced in app code (e.g. slug fields)
}

export interface TextField extends BaseField {
  type: "text" | "textarea" | "richText";
  minLength?: number;
  maxLength?: number;
}

export interface NumberField extends BaseField {
  type: "number";
  min?: number;
  max?: number;
}

export interface BooleanField extends BaseField {
  type: "boolean";
}

export interface DateField extends BaseField {
  type: "date";
}

export interface SelectField extends BaseField {
  type: "select";
  options: { label: string; value: string }[];
  many?: boolean;
}

export interface RelationshipField extends BaseField {
  type: "relationship";
  to: string; // another collection's slug
  many?: boolean;
}

export interface UploadField extends BaseField {
  type: "upload"; // references an existing Media row by id
}

export interface ArrayField extends BaseField {
  type: "array";
  fields: Field[]; // repeatable group of sub-fields
}

export interface BlocksField extends BaseField {
  type: "blocks";
  allow?: string[]; // Component keys allowed here; omit = allow any registered component
}

export type Field =
  | TextField
  | NumberField
  | BooleanField
  | DateField
  | SelectField
  | RelationshipField
  | UploadField
  | ArrayField
  | BlocksField;

export interface CollectionConfig {
  slug: string; // e.g. "posts" — matches Document.collection
  label: string;
  labelPlural?: string;
  fields: Field[];
  slugField?: string; // which field (if any) maps to Document.slug
  access?: {
    read?: "public" | string[];
    create?: string[];
    update?: string[];
    delete?: string[];
  };
}
```

> **Resolved per [RBAC_PLAN.md](RBAC_PLAN.md) §7** (RBAC v2 landed
> first): `access` uses permission-key strings, checked via the same
> `requirePermission`/`hasPermission` every other write path already
> uses — no separate access-control system for Collections. Keys are
> **not** auto-generated per collection; they're seeded manually like
> every other permission (`docs/RBAC_PLAN.md`'s "fixed, defined by
> developers" model). Concretely: Posts reuses its already-seeded
> `posts:create`/`posts:edit`/`posts:publish`/`posts:delete` keys once
> it migrates to a collection (phase 6) rather than getting a parallel
> `collection:posts:*` taxonomy for the same resource — a genuinely new
> collection (no prior hand-written model) gets its own new keys
> following the same `resource:action` pattern, seeded when that
> collection is registered.

### Example: redefining Posts as a collection

```ts
// src/collections/posts.ts
import type { CollectionConfig } from "./types";

export const posts: CollectionConfig = {
  slug: "posts",
  label: "Post",
  labelPlural: "Posts",
  slugField: "slug",
  access: {
    read: "public",
    create: ["posts:create"],
    update: ["posts:edit"],
    delete: ["posts:delete"],
  },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true },
    { name: "excerpt", type: "textarea" },
    { name: "body", type: "richText", required: true },
    { name: "publishedAt", type: "date" },
  ],
};
```

Collections get registered the same way blocks already are (see
[src/components/blocks/registry.tsx](../src/components/blocks/registry.tsx)
for the existing pattern this mirrors):

```ts
// src/collections/registry.ts
import { posts } from "./posts";

export const collectionRegistry = {
  posts,
  // future: teamMembers, products, faqs, ...
};
```

## 3. Validation

Postgres won't reject a malformed `data` JSON blob — validation has to
happen in app code, on every write, derived from the field config.
Recommendation: generate a [Zod](https://zod.dev) schema from a
`CollectionConfig` (one small function, `fieldToZod(field)`, mapping each
`FieldType` to a Zod type), rather than hand-writing a validator per
collection. This is the same idea as the config driving everything else —
write the mapping once, every new collection gets validation for free.

**Done**: [src/collections/validation.ts](../src/collections/validation.ts)
(`zod` `^4.6.5`) — `fieldToZod(field)` maps every `FieldType`, and
`collectionToZod(config)` composes a `CollectionConfig`'s fields into one
object schema. Notes on choices made translating the config shape into
Zod:

- `text`/`textarea`/`richText` → `z.string()` with `minLength`/`maxLength`
  as `.min()`/`.max()`; a `required` field with no explicit `minLength`
  gets `.min(1)` so an empty string doesn't satisfy "required".
- `date` → `z.string()` refined against `Date.parse` (not `z.coerce.date()`
  — a `Date` object isn't valid JSON and Prisma's `Json` field needs
  plain JSON-serializable values, so the stored/validated shape is an
  ISO string throughout).
- `select`/`relationship` → validated structurally (`select` against its
  `options`' values; `relationship` as a string id, or array if `many`) —
  neither confirms a relationship's target actually exists, since that
  needs a DB lookup, not schema validation (left for phase 4).
- `array`/`blocks` → recursive: `array` reuses the same field-list → Zod
  object builder for its `fields`; `blocks` validates
  `{ component: string, data: unknown }[]`, restricting `component` to
  `allow` when set. Each block's `data` isn't validated against its
  Component's own JSON Schema here — that's a separate, existing
  validation system (`Component.schema`), out of scope for this
  generator.
- `unique` is **not** enforced by this schema — it needs a query against
  existing `Document` rows, done at write time (phase 4), not structural
  validation.

Verified with a temporary script (`src/collections/_test-validation.ts`,
deleted after) run via `npx tsx`, covering both the plan's `posts` example
and a second config exercising every field type: valid data parses,
a missing required field fails, an invalid date string fails, omitted
optional fields still pass, an out-of-`options` select value fails, a
`blocks` entry outside `allow` fails, and a `number` field's `min` is
enforced. All passed as expected.

## 4. Phased build order

1. ~~**This config shape**~~ (`src/collections/types.ts`) — **done,
   2026-09-24**, no runtime behavior yet — nothing imports it. Also
   resolved the `access` shape per the note above.
2. ~~**`Document` Prisma model + migration**~~ — **done, 2026-09-24**:
   additive-only (`authorId` nullable, so no backfill needed), migration
   `20260923215026_collections_document_model`. Verified against the
   real local database, not just `tsc`: created a real `Document` row
   (`collection: "posts"`), fetched it back by its `[collection, slug]`
   unique key, confirmed a duplicate `[collection, slug]` insert is
   actually rejected by the constraint (not just assumed from the
   schema), then deleted it and confirmed the delete took. No app code
   reads/writes `Document` yet — that's phase 4.
3. ~~**Config → Zod validator generator**~~ — **done**:
   [src/collections/validation.ts](../src/collections/validation.ts), see
   §3 above for what shipped and how it was verified.
4. ~~**Generic server actions**~~ — **done**:
   [src/collections/registry.ts](../src/collections/registry.ts) (a
   `slug → CollectionConfig` map, mirroring
   [src/components/blocks/registry.tsx](../src/components/blocks/registry.tsx)'s
   pattern for Components — empty until phase 6 registers Posts) and
   [src/collections/actions.ts](../src/collections/actions.ts)
   (`createDocument(collectionSlug, input)`, `updateDocument(id, input)`,
   `deleteDocument(id)`). Each: looks up the collection's config,
   authorizes via `access.<action>` (any one of the listed permission
   keys grants access — OR, not AND; an action with no keys configured
   fails closed rather than being treated as open), validates `input`
   against `collectionToZod(config)` (phase 3), rejects a write that
   would collide with an existing Document on a `unique` field (a real
   `prisma.document.findFirst` against the JSONB `data` column, since
   Postgres itself can't enforce uniqueness inside JSON), then writes to
   `Document` — deriving `Document.slug` from `config.slugField` when
   set. `update`/`delete` resolve the collection from the existing
   Document's own `collection` value, so callers only ever pass an `id`.
   No admin UI calls these yet (phase 5) and no `revalidatePath` calls
   were added for that reason — left for phase 5 once real route paths
   exist to invalidate.

   Verified against the real local database and real sessions, not just
   `tsc`: registered a temporary `test-items` collection (reusing the
   already-seeded `posts:create`/`posts:edit`/`posts:delete` permission
   keys) behind a temporary API route
   (`src/app/api/zzz-test-collections-temp/`, deleted after — note the
   first attempt at `_test-collections` 404'd, since Next.js treats a
   `_`-prefixed route folder as a private, unrouted segment). Logged in
   as the real seeded editor/viewer/admin via actual NextAuth credentials
   POSTs, then drove the real actions via real HTTP requests against the
   running dev server: created a real Document as editor; a duplicate
   `name` was rejected by the uniqueness check; a request missing the
   required `name` field was rejected by Zod with a real per-field error
   message; updated the Document as editor; confirmed the viewer (who
   holds neither `posts:create` nor `posts:delete`) got a real `403`-style
   `Forbidden` response from both `create` and `delete`, not a
   silently-hidden option; deleted the Document as admin (who does hold
   `posts:delete`); confirmed a further update against the now-deleted id
   genuinely threw Prisma's `findUniqueOrThrow` not-found error rather
   than silently succeeding; and confirmed via a one-off script that zero
   `test-items` rows were left in the database afterward.

5. ~~**Generic admin UI**~~ — **done**:
   [src/app/admin/[collection]/page.tsx](../src/app/admin/[collection]/page.tsx)
   (list), `.../new/page.tsx` (create form), `.../[id]/page.tsx` (edit
   form + delete), and `.../actions.ts` (thin `"use server"` wrappers
   converting `FormData` via the new
   [src/collections/formData.ts](../src/collections/formData.ts) before
   calling phase 4's `createDocument`/`updateDocument`/`deleteDocument` —
   all authorization/validation/uniqueness stays in those, this layer is
   just glue plus `redirect`/`revalidatePath`).
   [src/collections/FieldInput.tsx](../src/collections/FieldInput.tsx) is
   the `<FieldInput field={field} />` component the plan called for, one
   case per `FieldType`; a shared `hasCollectionAccess` (pulled out of
   phase 4's `actions.ts` into
   [src/collections/access.ts](../src/collections/access.ts), so the
   server actions and the admin UI can't check `access.<action>`
   differently) decides what each page renders — same "read is always
   visible, write UI only for whoever holds the permission" pattern
   `/admin/pages` already uses, right down to a disabled read-only form
   instead of a form at all. The admin sidebar now also renders one nav
   item per registered collection instead of a fixed list, so nothing
   needs editing there when phase 6 registers Posts.

   Two deliberate MVP simplifications, both matching existing precedent
   rather than introducing a new pattern: `array`/`blocks` fields render
   as raw JSON textareas, not a dynamic add/remove UI — the same "no
   visual editor yet, raw JSON for now" state Block data on Pages is
   already in. `relationship`/`upload` fields are plain text inputs for
   an id (one per line for a `many` relationship) — there's no
   cross-collection browse/picker UI yet either.

   Verified against the real database through the real rendered UI, not
   just `tsc`: temporarily registered a `zzz-test-items` collection
   (text/textarea/boolean/select fields, reusing the seeded
   `posts:create`/`edit`/`delete` keys) and ran the dev server. Logged in
   as editor via real NextAuth credentials POSTs, fetched
   `/admin/zzz-test-items/new`, and drove its actual rendered form as a
   real multipart POST (extracting the real `$ACTION_1:0`/`$ACTION_1:1`
   bound-action fields, not simulated) — got redirected to a real new
   Document's edit page with every submitted value (text, textarea,
   select) rendering back correctly. Updated it the same way and
   confirmed the new values persisted on refetch. Logged in as viewer and
   confirmed the list page hides "New", the edit page renders all fields
   `disabled` with no Save/Delete button, and navigating straight to
   `/new` redirects away. Logged in as admin (the only seeded role
   holding `posts:delete`) and deleted the real Document via its actual
   rendered delete form — confirmed the edit page 404s afterward — then
   confirmed via a one-off script that zero `zzz-test-items` rows
   remained. Reverted the temporary registry entry before committing.

6. ~~**Migrate `Post` to be the first real collection**~~ — **done**:
   [src/collections/posts.ts](../src/collections/posts.ts) (the exact
   config from §2's example) registered in `registry.ts`; the old stub
   `src/app/admin/posts/page.tsx` deleted so `/admin/posts` now resolves
   to the generic `/admin/[collection]` route; the hand-written
   `/api/v1/posts` and `/api/v1/posts/[slug]` routes rewritten to query
   `Document` (`collection: "posts"`) instead of the `Post` table,
   through a new [src/collections/serialize.ts](../src/collections/serialize.ts)
   (`documentToJson`) that flattens a Document's `data` back into the
   same flat shape (`title`/`slug`/`excerpt`/`body`/`publishedAt` at the
   top level) the old API returned — no observable change for any
   consumer. `documentToJson` is written generically because phase 7's
   `/api/[collection]` routes need the same flattening for every
   collection, not just Posts. The `Post` Prisma model (and its relation
   on `User`) is dropped — migration
   `20260928044040_drop_post_model` — confirmed safe first: zero `Post`
   rows existed locally (no create UI had ever shipped for it), and the
   user confirmed none exist in production either.

   **Found and fixed a real gap while doing this**: phase 5's generic
   admin UI had no way to move a Document out of `DRAFT` — there was no
   `setDocumentStatus`-equivalent, unlike Pages' `setPageStatus`. Posts
   created through the new UI would otherwise be permanently invisible to
   the public API. Added `setDocumentStatus(id, status)` to
   `src/collections/actions.ts` (gated on `access.update`, matching how
   `setPageStatus` uses `pages:edit` rather than a separate publish
   permission) and wired `Set DRAFT`/`Set PUBLISHED`/`Set ARCHIVED`
   buttons onto `/admin/[collection]/[id]`, styled and gated exactly like
   Pages' equivalent buttons.

   Verified against the real database through the real rendered UI:
   ran the dev server, logged in as editor via real NextAuth credentials
   POSTs, drove the real `/admin/posts/new` form as a real multipart POST
   to create a real Post — confirmed it was DRAFT and correctly absent
   from `/api/v1/posts` and `/api/v1/posts/hello-world` (`404`). Clicked
   the real `Set PUBLISHED` button (its actual bound Server Action, not
   simulated) — confirmed the status persisted and the post now appeared
   in both REST endpoints with the exact same flat field shape the old
   hand-written API returned. Attempted a second post with the same slug
   and confirmed the uniqueness check rejected it. Deleted the post as
   admin via the real rendered delete form, confirmed the edit page 404s
   and both REST endpoints stop returning it, and confirmed via a one-off
   script that zero `posts` Document rows remained. Also ran
   `npx next typegen` after deleting the old stub route — its removal
   left a stale generated route-type reference that failed `tsc` until
   regenerated (the exact gotcha `PROJECT_PLAN.md` §7 already documents
   for this project).

7. Generic public API: `/api/[collection]` and `/api/[collection]/[slug]`,
   respecting `access.read`.

Each phase is independently useful and testable — we don't have to build
all of it before anything works.

## Open questions before implementation starts

- Should `richText` store plain markdown, HTML, or a structured JSON doc
  (like Payload's Lexical/Slate)? Structured is more powerful (safer
  rendering, block-level formatting) but is real editor work. Markdown is
  far simpler to ship first.
- Do we need field-level draft/version history now, or is page-level
  `status` (DRAFT/PUBLISHED/ARCHIVED, which we already have) enough for a
  while?
