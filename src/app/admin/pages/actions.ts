"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createPage(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

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

export async function setPageStatus(pageId: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
  await prisma.page.update({
    where: { id: pageId },
    data: { status },
  });

  revalidatePath(`/admin/pages/${pageId}`);
  revalidatePath("/admin/pages");
}
