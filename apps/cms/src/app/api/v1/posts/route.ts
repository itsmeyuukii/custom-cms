import { prisma } from "@/lib/prisma";
import { apiSuccess } from "@/lib/api-response";
import { documentToJson } from "@/collections/serialize";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "10");
  const cappedPageSize = Math.min(pageSize, 100); // Limit the maximum page size to 100

  const where = { collection: "posts", status: "PUBLISHED" as const };

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
