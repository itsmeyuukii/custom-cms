import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { collectionRegistry } from "@/collections/registry";
import { hasReadAccess } from "@/collections/access";
import { documentToJson } from "@/collections/serialize";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ collection: string; slug: string }> },
) {
  const { collection: collectionSlug, slug } = await params;

  const config = collectionRegistry[collectionSlug];
  if (!config) {
    return apiError(
      "COLLECTION_NOT_FOUND",
      `Unknown collection: "${collectionSlug}"`,
      404,
    );
  }

  const session = await auth();
  if (!(await hasReadAccess(session?.user?.roleSlugs, config))) {
    return apiError(
      "FORBIDDEN",
      `You don't have access to read collection "${collectionSlug}"`,
      403,
    );
  }

  const document = await prisma.document.findFirst({
    where: { collection: collectionSlug, slug, status: "PUBLISHED" },
  });

  if (!document) {
    return apiError("NOT_FOUND", `${config.label} not found`, 404);
  }

  return apiSuccess(documentToJson(document));
}
