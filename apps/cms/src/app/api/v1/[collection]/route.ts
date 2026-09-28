// Generic public API for Collections (docs/COLLECTIONS_PLAN.md §4 phase
// 7) — lists a collection's published Documents. Absorbs any hand-written
// per-collection route like the old /api/v1/posts once that collection
// is registered (see src/collections/registry.ts), since this route only
// wins over one when no static folder of the same name exists.

import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { collectionRegistry } from "@/collections/registry";
import { hasReadAccess } from "@/collections/access";
import { documentToJson } from "@/collections/serialize";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ collection: string }> },
) {
  const { collection: slug } = await params;

  const config = collectionRegistry[slug];
  if (!config) {
    return apiError(
      "COLLECTION_NOT_FOUND",
      `Unknown collection: "${slug}"`,
      404,
    );
  }

  const session = await auth();
  if (!(await hasReadAccess(session?.user?.roleSlugs, config))) {
    return apiError(
      "FORBIDDEN",
      `You don't have access to read collection "${slug}"`,
      403,
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "10");
  const cappedPageSize = Math.min(pageSize, 100); // Limit the maximum page size to 100

  const where = { collection: slug, status: "PUBLISHED" as const };

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * cappedPageSize,
      take: cappedPageSize,
    }),
    prisma.document.count({ where }),
  ]);

  return apiSuccess(documents.map(documentToJson), {
    page,
    pageSize: cappedPageSize,
    total,
  });
}
