import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";

export default async function CmsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const page = await prisma.page.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: {
      blocks: {
        orderBy: { order: "asc" },
        include: { component: true },
      },
    },
  });

  if (!page) notFound();

  return <BlockRenderer blocks={page.blocks} />;
}
