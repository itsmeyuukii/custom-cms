# Collections System — Design Plan

Goal: a Payload-style config-driven content system, built on our own stack
(Next.js + Prisma + Postgres), so adding a new content type is "write a
config object" instead of "write a Prisma model + migration + admin pages

- API route" by hand every time.

**Status: design only, nothing in this doc is implemented yet.**

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

What's missing is everything _else_ — Posts (currently just a stub list,
no create/edit form), and any future content type (team members, products,
FAQs...) — each of which would otherwise need its own hand-written Prisma
model + migration + admin pages, exactly like `Page` did. The Collections
system replaces that hand-written path. **Posts becomes the first real
collection** — proof that the system works, and it finally gets a create
UI.

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
    read?: "public" | Role[];
    create?: Role[];
    update?: Role[];
    delete?: Role[];
  };
}
```

> **Superseded by [RBAC_PLAN.md](RBAC_PLAN.md):** `Role[]` above refers
> to the fixed three-value enum from the first RBAC pass. Once RBAC v2
> lands (database-driven, admin-creatable roles), this shape changes to
> permission-key strings (`create?: string[]`, e.g. `["pages:create"]`)
> — see that doc's §7. Not fixed here since Collections isn't built yet
> either; whichever lands second should just use the other's real shape.

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
    create: ["ADMIN", "EDITOR"],
    update: ["ADMIN", "EDITOR"],
    delete: ["ADMIN"],
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

## 4. Phased build order

1. **This config shape** (`src/collections/types.ts`) — done once this
   plan is agreed on, no runtime behavior yet.
2. `Document` Prisma model + migration.
3. Config → Zod validator generator.
4. Generic server actions: `createDocument(collectionSlug, data)`,
   `updateDocument`, etc. — validate against the collection config, then
   write to `Document`.
5. Generic admin UI: `/admin/[collection]` list page and
   `/admin/[collection]/[id]` edit page, rendering a form generated from
   the field config (a `<FieldInput field={field} />` component with one
   case per `FieldType`).
6. Migrate `Post` to be the first real collection end-to-end (retire the
   old stub `/admin/posts` page, retire the `Post` Prisma model once data
   is migrated).
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
