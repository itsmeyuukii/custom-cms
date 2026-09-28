"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ContentStatus } from "@prisma/client";
import { collectionRegistry } from "@/collections/registry";
import { parseDocumentFormData } from "@/collections/formData";
import {
  createDocument,
  updateDocument,
  deleteDocument,
  setDocumentStatus,
} from "@/collections/actions";

function requireConfig(collectionSlug: string) {
  const config = collectionRegistry[collectionSlug];
  if (!config) throw new Error(`Unknown collection: "${collectionSlug}"`);
  return config;
}

export async function createDocumentAction(
  collectionSlug: string,
  formData: FormData,
) {
  const config = requireConfig(collectionSlug);
  const input = parseDocumentFormData(config, formData);
  const document = await createDocument(collectionSlug, input);

  revalidatePath(`/admin/${collectionSlug}`);
  redirect(`/admin/${collectionSlug}/${document.id}`);
}

export async function updateDocumentAction(
  collectionSlug: string,
  id: string,
  formData: FormData,
) {
  const config = requireConfig(collectionSlug);
  const input = parseDocumentFormData(config, formData);
  await updateDocument(id, input);

  revalidatePath(`/admin/${collectionSlug}`);
  revalidatePath(`/admin/${collectionSlug}/${id}`);
}

export async function setDocumentStatusAction(
  collectionSlug: string,
  id: string,
  status: ContentStatus,
) {
  await setDocumentStatus(id, status);

  revalidatePath(`/admin/${collectionSlug}`);
  revalidatePath(`/admin/${collectionSlug}/${id}`);
}

export async function deleteDocumentAction(collectionSlug: string, id: string) {
  await deleteDocument(id);

  revalidatePath(`/admin/${collectionSlug}`);
  redirect(`/admin/${collectionSlug}`);
}
