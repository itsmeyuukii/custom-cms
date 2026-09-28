import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api-response";
import { documentToJson } from "@/collections/serialize";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const document = await prisma.document.findFirst({
    where: { collection: "posts", slug, status: "PUBLISHED" },
  });

  if (!document) {
    return apiError("POST_NOT_FOUND", "Post not found", 404);
  }

  return apiSuccess(documentToJson(document));
}
