// Flattens a Document's `data` into a plain object alongside its own
// top-level fields, for JSON API responses — keeps a collection's public
// API shape looking like a normal resource (id/slug/status/timestamps +
// its fields) rather than exposing the Document/data wrapper underneath.

import type { Document } from "@prisma/client";

export function documentToJson(document: Document) {
  const data = document.data as Record<string, unknown>;
  // `data` first, so a field that happens to share a name with one of the
  // Document's own columns (e.g. `id`) can't replace it.
  return {
    ...data,
    id: document.id,
    slug: document.slug,
    status: document.status,
    authorId: document.authorId,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
