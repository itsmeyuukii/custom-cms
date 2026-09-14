import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    const post = await prisma.post.findUnique({
        where: { slug, status: "PUBLISHED" },
    });

    if (!post) {
        return apiError("POST_NOT_FOUND", "Post not found", 404);
    }

    return apiSuccess(post);
}