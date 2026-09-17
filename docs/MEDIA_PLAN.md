# Media Upload Flow

Goal: let an admin/editor upload a file from `/admin/media` and get back
a public URL they can use — starting with pasting it into a Block's raw
JSON (e.g. `CardGrid`'s `imageUrl` field), same way all Block content is
entered today.

**Status: Phases 1–2 (upload) done 2026-09-17, Phase 3 (deletion) done
2026-09-17** — see `PROJECT_PLAN.md` §3 for what shipped and how each
was verified.

## Context this design rests on

Two constraints from the existing codebase shape this more than anything
else:

- **Storage must be a hosted object store, not local disk.** The app
  runs on Vercel, where Server Actions/Route Handlers execute in
  ephemeral, effectively-read-only serverless functions — a file written
  to local disk during one request will not exist for the next request,
  let alone survive a redeploy. **Decided: [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)** — same
  reasoning as picking Prisma Postgres for the database (see
  `PROJECT_PLAN.md` §7 gotchas): it's the native, lowest-friction option
  for this hosting target, with a free tier and no separate provider
  signup.
- **Blocks don't have a visual editor yet** (`PROJECT_PLAN.md` §4: "Block
  content is entered as raw JSON in the admin"). So this plan does **not**
  build a media picker wired into Block editing — that's meaningless
  until a visual Block editor exists to embed it in. Scope here stops at:
  upload a file, get a URL back, see it in a library list. Wiring a
  picker into Block data entry is follow-on work for whenever the visual
  editor is built, not part of this.

## What this depends on / doesn't touch

- Builds on RBAC v2 (`RBAC_PLAN.md`), already fully shipped. The
  permission keys this needs — `media:upload` and `media:delete` — are
  already seeded (`RBAC_PLAN.md` §2) and already granted to the Editor
  role, so no RBAC change is needed, just using what exists.
- Uses the existing `Media` Prisma model as-is (`filename`, `url`,
  `mimeType`, `size`, `alt`, `uploaderId`, `createdAt`) — no schema
  changes. It already has everything a Blob-backed upload needs to
  record.
- Does not touch the public REST API (`src/app/api/v1/`). Vercel Blob
  URLs are public by default, so a URL pasted into Block JSON is
  fetchable immediately with no new endpoint. A `/api/v1/media` listing
  endpoint would only matter for an external client that needs to browse
  the library itself — nothing today needs that; left as an open
  question below rather than built speculatively.

## 1. Upload path

A Server Action (`src/app/admin/media/actions.ts`), consistent with
every other admin mutation in this codebase (`CLAUDE.md`: "Server
Actions for admin mutations... not API routes"):

```ts
"use server";

export async function uploadMedia(formData: FormData) {
  const session = await requirePermission("media:upload");

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file provided");

  // validate mime type + size (see §2) before ever calling put()

  const blob = await put(file.name, file, {
    access: "public",
    addRandomSuffix: true, // avoid filename collisions across uploads
  });

  await prisma.media.create({
    data: {
      filename: file.name,
      url: blob.url,
      mimeType: file.type,
      size: file.size,
      alt: String(formData.get("alt") ?? "") || null,
      uploaderId: session.user.id,
    },
  });

  revalidatePath("/admin/media");
}
```

Uses `put()` from `@vercel/blob` directly inside the Server Action
(server-side upload), not the `@vercel/blob/client` direct-to-browser
flow — simpler, and sufficient as long as files stay under the body-size
limit Server Actions accept on Vercel (a few MB by default). This
matches the size cap in §2 below, so it's a real constraint being
designed around, not an oversight — see Open Questions for what changes
if that stops being true.

## 2. Validation

Checked in the Server Action, before calling `put()`:

- **MIME type allow-list**: `image/png`, `image/jpeg`, `image/gif`,
  `image/webp`. Anything else is rejected. Deliberately images-only for
  v1 — matches every current use of `Media` (`CardGrid.imageUrl`,
  `Hero`'s implied use) and keeps the allow-list simple to reason about.
- **Size cap**: 4 MB, kept comfortably under Vercel's default Server
  Action body-size limit so an oversized upload fails with a clear
  validation error instead of an opaque platform-level rejection.

Both checks throw a plain `Error` with a user-facing message — same
pattern `createPage` already uses for its own validation.

## 3. Admin UI (`/admin/media`)

Replaces today's list-only placeholder
(`src/app/admin/media/page.tsx`):

- Upload form at the top — file input + optional `alt` text field,
  `action={uploadMedia}`, gated the same way `/admin/pages/new` gates
  `createPage`: `hasPermission(session?.user?.roleSlugs, "media:upload")`
  controls whether the form renders at all (server-side check in the
  action is what actually enforces it either way).
- Grid below shows each `Media` row: a thumbnail (`<img>`, since these
  are all images per §2), filename, and the full URL in a `<input
readOnly>` so it's trivially copyable to paste into a Block's JSON.
- No pagination — matches the precedent already set by `/admin/roles`
  and `/admin/users` (small, all-seeded-data lists), reasonable until the
  library actually grows large enough to matter.

## 4. Deletion — done, 2026-09-17

`deleteMedia(mediaId)` (`src/app/admin/media/actions.ts`), gated on the
already-seeded `media:delete` permission: looks up the `Media` row,
calls `del(media.url)` (`@vercel/blob`) to remove the blob, then deletes
the row. A "Delete" button per grid item on `/admin/media`, rendered
only when the session holds `media:delete`, posts to it via
`deleteMedia.bind(null, item.id)` — same bound-server-action shape as
`setPageStatus`/`addBlock` on the Pages admin UI. No confirmation
dialog: matches this admin's existing precedent (no other destructive
action in the admin UI has one either), revisit only if this becomes a
real problem in practice.

## 5. Environment setup

New env var: `BLOB_READ_WRITE_TOKEN`. Add to `.env.example` as a
placeholder and to `.env` locally with a real value (Vercel Blob works
the same from local dev as production — it's a hosted store, not a
build-time-only integration). Production: connect the Blob store to the
Vercel project the same way Prisma Postgres was connected
(`PROJECT_PLAN.md` §7's env-var gotchas apply here too — double check
the actual generated variable name in the Vercel dashboard rather than
assuming it's exactly `BLOB_READ_WRITE_TOKEN` before wiring it in).

New dependency: `@vercel/blob`.

## Phased build order

1. Install `@vercel/blob`, wire up `BLOB_READ_WRITE_TOKEN` locally, write
   `uploadMedia` (§1–2) with no UI yet — verify by driving the action
   directly (same "real multipart POST against a real server action"
   verification style used for every RBAC v2 phase) and confirming a
   real `Media` row + real Blob URL that actually resolves.
2. Build the `/admin/media` upload form + updated grid (§3), wired to
   the now-working action. Verify end-to-end in the browser: upload a
   real image, confirm it appears in the grid, copy its URL into a
   `CardGrid` block's raw JSON on a test page, confirm it renders on the
   public page.
3. Wire the production `BLOB_READ_WRITE_TOKEN`, confirm a real upload
   against the production database + production Blob store the same way
   RBAC v2's production verification worked — not just "it typechecks."

## Open questions

- **Deletion.** Worth doing right after upload lands, or fine to leave
  until the library is big enough to need cleanup? Leaning toward
  "small enough to do right after," but not required to unblock upload
  itself.
- **Files bigger than the Server Action body limit.** If non-image media
  (video, large PDFs) ever becomes a real need, this design's
  server-side `put()` call stops being sufficient and the direct-to-
  browser `@vercel/blob/client` upload flow (client gets a signed token,
  uploads straight to Blob, server never sees the file body) would
  replace §1. Not needed for images at the 4 MB cap, so deferred rather
  than built speculatively.
- **`/api/v1/media` listing endpoint.** Not built here (see "What this
  depends on / doesn't touch") — revisit if/when a separate frontend
  (per `MONOREPO_PLAN.md`) actually needs to browse media rather than
  just render URLs already embedded in Page/Post content it fetches.
- **Media picker in Block editing.** Blocked on a visual Block editor
  existing at all — not this plan's problem to solve, noted here so it
  isn't forgotten when that editor eventually gets designed.
