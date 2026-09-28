import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { collectionRegistry } from "@/collections/registry";
import { hasCollectionAccess } from "@/collections/access";
import { FieldInput } from "@/collections/FieldInput";
import { updateDocumentAction, deleteDocumentAction } from "../actions";

export default async function EditDocument({
  params,
}: {
  params: Promise<{ collection: string; id: string }>;
}) {
  const { collection: slug, id } = await params;

  const config = collectionRegistry[slug];
  if (!config) notFound();

  const [document, session] = await Promise.all([
    prisma.document.findFirst({ where: { id, collection: slug } }),
    auth(),
  ]);
  if (!document) notFound();

  const [canUpdate, canDelete] = await Promise.all([
    hasCollectionAccess(session?.user?.roleSlugs, config, "update"),
    hasCollectionAccess(session?.user?.roleSlugs, config, "delete"),
  ]);

  const data = document.data as Record<string, unknown>;
  const updateThisDocument = updateDocumentAction.bind(null, slug, id);
  const deleteThisDocument = deleteDocumentAction.bind(null, slug, id);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {document.slug ?? document.id}
          </h1>
          <p className="text-sm text-gray-500">
            {config.label} · {document.status}
          </p>
        </div>
        {canDelete && (
          <form action={deleteThisDocument}>
            <button
              type="submit"
              className="rounded border border-red-300 px-3 py-1 text-xs text-red-600"
            >
              Delete
            </button>
          </form>
        )}
      </div>

      <form action={updateThisDocument} className="mt-6 space-y-4">
        {config.fields.map((field) => (
          <FieldInput
            key={field.name}
            field={field}
            defaultValue={data[field.name]}
            disabled={!canUpdate}
          />
        ))}
        {canUpdate && (
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-sm text-white"
          >
            Save
          </button>
        )}
      </form>
    </div>
  );
}
