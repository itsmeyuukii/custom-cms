import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { collectionRegistry } from "@/collections/registry";
import { hasCollectionAccess } from "@/collections/access";

export default async function CollectionList({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection: slug } = await params;

  const config = collectionRegistry[slug];
  if (!config) notFound();

  const labelPlural = config.labelPlural ?? `${config.label}s`;

  const [documents, session] = await Promise.all([
    prisma.document.findMany({
      where: { collection: slug },
      orderBy: { updatedAt: "desc" },
    }),
    auth(),
  ]);

  const canCreate = await hasCollectionAccess(
    session?.user?.roleSlugs,
    config,
    "create",
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{labelPlural}</h1>
        {canCreate && (
          <Link
            href={`/admin/${slug}/new`}
            className="rounded bg-black px-4 py-2 text-sm text-white"
          >
            New {config.label}
          </Link>
        )}
      </div>

      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="py-2">{config.slugField ? "Slug" : "ID"}</th>
            <th className="py-2">Status</th>
            <th className="py-2">Updated</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id} className="border-b border-gray-100">
              <td className="py-2">
                <Link
                  href={`/admin/${slug}/${document.id}`}
                  className="hover:underline"
                >
                  {document.slug ?? document.id}
                </Link>
              </td>
              <td className="py-2">{document.status}</td>
              <td className="py-2 text-gray-500">
                {document.updatedAt.toLocaleDateString()}
              </td>
            </tr>
          ))}
          {documents.length === 0 && (
            <tr>
              <td colSpan={3} className="py-6 text-center text-gray-400">
                No {labelPlural.toLowerCase()} yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
