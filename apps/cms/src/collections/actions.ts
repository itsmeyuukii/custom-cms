"use server";

// Generic Document server actions (docs/COLLECTIONS_PLAN.md §4 phase 4).
// One create/update/delete per collection instead of hand-writing them
// per content type, the same way src/app/admin/pages/actions.ts writes
// Page/Block directly — the collection's config is what makes this
// generic (validation shape, slug field, access keys), not the Prisma
// call underneath.

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { collectionToZod } from "./validation";
import { getCollectionConfig } from "./registry";
import { requireCollectionAccess } from "./access";
import type { CollectionConfig } from "./types";

function parseDocumentData(config: CollectionConfig, input: unknown) {
  const result = collectionToZod(config).safeParse(input);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid data for collection "${config.slug}": ${issues}`);
  }
  return result.data as Prisma.InputJsonObject;
}

function slugFromData(
  config: CollectionConfig,
  data: Prisma.InputJsonObject,
): string | null {
  if (!config.slugField) return null;
  const value = data[config.slugField];
  return typeof value === "string" ? value : null;
}

/** Rejects a write that would collide with an existing Document on a `unique` field. */
async function assertUniqueFields(
  config: CollectionConfig,
  data: Prisma.InputJsonObject,
  excludeId?: string,
) {
  for (const field of config.fields) {
    if (!field.unique) continue;
    const value = data[field.name];
    if (value === undefined || value === null) continue;

    const existing = await prisma.document.findFirst({
      where: {
        collection: config.slug,
        id: excludeId ? { not: excludeId } : undefined,
        data: { path: [field.name], equals: value },
      },
      select: { id: true },
    });

    if (existing) {
      throw new Error(
        `"${field.label ?? field.name}" must be unique — "${String(value)}" is already in use`,
      );
    }
  }
}

export async function createDocument(collectionSlug: string, input: unknown) {
  const config = getCollectionConfig(collectionSlug);
  const session = await requireCollectionAccess(config, "create");

  const data = parseDocumentData(config, input);
  await assertUniqueFields(config, data);

  return prisma.document.create({
    data: {
      collection: config.slug,
      slug: slugFromData(config, data),
      data,
      authorId: session.user.id,
    },
  });
}

export async function updateDocument(id: string, input: unknown) {
  const existing = await prisma.document.findUniqueOrThrow({ where: { id } });
  const config = getCollectionConfig(existing.collection);
  await requireCollectionAccess(config, "update");

  const data = parseDocumentData(config, input);
  await assertUniqueFields(config, data, id);

  return prisma.document.update({
    where: { id },
    data: {
      slug: slugFromData(config, data),
      data,
    },
  });
}

export async function deleteDocument(id: string) {
  const existing = await prisma.document.findUniqueOrThrow({ where: { id } });
  const config = getCollectionConfig(existing.collection);
  await requireCollectionAccess(config, "delete");

  await prisma.document.delete({ where: { id } });
}
