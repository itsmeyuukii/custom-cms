import { prisma } from "@/lib/prisma";
import { apiSuccess } from "@/lib/api-response";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "10");
    const cappedPageSize = Math.min(pageSize, 100); // Limit the maximum page size to 100

    const [pages, total] = await Promise.all([
        prisma.page.findMany({
            where: { status: "PUBLISHED" },
            orderBy: { updatedAt: "desc" },
            skip: (page - 1) * cappedPageSize,
            take: cappedPageSize,
        }),
        prisma.page.count({
            where: { status: "PUBLISHED" },
        }),
    ]);
    return apiSuccess(pages, { page, pageSize: cappedPageSize, total });
}
