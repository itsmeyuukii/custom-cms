"use server";

import { put, del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB, see docs/MEDIA_PLAN.md §2

export async function uploadMedia(formData: FormData) {
  const session = await requirePermission("media:upload");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    throw new Error("No file provided");

  if (!ALLOWED_MIME_TYPES.includes(file.type))
    throw new Error(
      `Unsupported file type "${file.type}". Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
    );

  if (file.size > MAX_FILE_SIZE_BYTES)
    throw new Error(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`,
    );

  const blob = await put(file.name, file, {
    access: "public",
    addRandomSuffix: true,
  });

  await prisma.media.create({
    data: {
      filename: file.name,
      url: blob.url,
      mimeType: file.type,
      size: file.size,
      alt: String(formData.get("alt") ?? "").trim() || null,
      uploaderId: session.user.id,
    },
  });

  revalidatePath("/admin/media");
}

export async function deleteMedia(mediaId: string) {
  await requirePermission("media:delete");

  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) throw new Error("Media not found");

  await del(media.url);
  await prisma.media.delete({ where: { id: mediaId } });

  revalidatePath("/admin/media");
}
