"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertValidBlock } from "@/lib/block-validation";
import { type FormState, toFormState, UserError } from "@/lib/form-errors";
import { requirePermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function createPage(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requirePermission("pages:create");

  return toFormState(async () => {
    const title = String(formData.get("title") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();

    if (!title || !slug) throw new UserError("Title and slug are required");

    const page = await prisma.page.create({
      data: {
        title,
        slug,
        authorId: session.user.id,
      },
    });

    revalidatePath("/admin/pages");
    redirect(`/admin/pages/${page.id}`);
  });
}

export async function addBlock(
  pageId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("pages:edit");

  return toFormState(async () => {
    const componentId = String(formData.get("componentId") ?? "");
    const dataRaw = String(formData.get("data") ?? "{}");

    let data: unknown;
    try {
      data = JSON.parse(dataRaw);
    } catch {
      throw new UserError("Block data must be valid JSON");
    }

    // Against the component's schema, before anything is written
    // (docs/BLOCK_VALIDATION_PLAN.md).
    await assertValidBlock({ id: componentId }, data);

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
  });
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
