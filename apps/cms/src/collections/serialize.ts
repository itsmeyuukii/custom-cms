// Flattens a Document's `data` into a plain object alongside its own
// top-level fields, for JSON API responses — keeps a collection's public
// API shape looking like a normal resource (id/slug/status/timestamps +
// its fields) rather than exposing the Document/data wrapper underneath.

import type { Document } from "@prisma/client";

export function documentToJson(document: Document) {
  const data = document.data as Record<string, unknown>;
  return {
    id: document.id,
    ...data,
    slug: document.slug,
    status: document.status,
    authorId: document.authorId,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
