import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
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

    if (!page) {
        return apiError("PAGE_NOT_FOUND", "Page not found", 404);
    }

    return apiSuccess(page);
}

