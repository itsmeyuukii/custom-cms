"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function createPage(formData: FormData) {
  const session = await requirePermission("pages:create");

  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();

  if (!title || !slug) throw new Error("Title and slug are required");

  const page = await prisma.page.create({
    data: {
      title,
      slug,
      authorId: session.user.id,
    },
  });

  revalidatePath("/admin/pages");
  redirect(`/admin/pages/${page.id}`);
}

export async function addBlock(pageId: string, formData: FormData) {
  await requirePermission("pages:edit");

  const componentId = String(formData.get("componentId") ?? "");
  const dataRaw = String(formData.get("data") ?? "{}");

  let data: unknown;
  try {
    data = JSON.parse(dataRaw);
  } catch {
    throw new Error("Block data must be valid JSON");
  }

  const lastBlock = await prisma.block.findFirst({
    where: { pageId },
    orderBy: { order: "desc" },
  });

  await prisma.block.create({
    data: {
      pageId,
      componentId,
      order: (lastBlock?.order ?? -1) + 1,
      data: data as object,
    },
  });

  revalidatePath(`/admin/pages/${pageId}`);
}

export async function setPageStatus(
  pageId: string,
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED",
) {
  // Gated on pages:edit rather than pages:publish so this matches today's
  // behavior exactly (WRITE_ROLES let an editor set any status) — the
  // seeded Editor role doesn't hold pages:publish yet, and giving this
  // one action a stricter check than the rest of the write surface would
  // be a silent capability regression, not a mechanical migration.
  await requirePermission("pages:edit");

  await prisma.page.update({
    where: { id: pageId },
    data: { status },
  });

  revalidatePath(`/admin/pages/${pageId}`);
  revalidatePath("/admin/pages");
}
