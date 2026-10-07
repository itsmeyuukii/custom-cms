import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { collectionRegistry } from "@/collections/registry";
import { hasCollectionAccess } from "@/collections/access";
import { FieldInput } from "@/collections/FieldInput";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldGroup } from "@/components/ui/fieldset";
import { Text } from "@/components/ui/text";
import {
  updateDocumentAction,
  deleteDocumentAction,
  setDocumentStatusAction,
} from "../actions";

const statusColors = {
  DRAFT: "yellow",
  PUBLISHED: "green",
  ARCHIVED: "zinc",
} as const;

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
          <h1 className="text-2xl font-semibold text-zinc-900">
            {document.slug ?? document.id}
          </h1>
          <Text>
            {config.label}{" "}
            <Badge className="ml-1" color={statusColors[document.status]}>
              {document.status}
            </Badge>
          </Text>
        </div>
        {canDelete && (
          <form action={deleteThisDocument}>
            <Button type="submit" variant="danger">
              Delete
            </Button>
          </form>
        )}
      </div>

      {canUpdate && (
        <div className="mt-4 flex gap-2">
          {(["DRAFT", "PUBLISHED", "ARCHIVED"] as const).map((status) => (
            <form
              key={status}
              action={setDocumentStatusAction.bind(null, slug, id, status)}
            >
              <Button
                type="submit"
                variant="secondary"
                disabled={document.status === status}
              >
                Set {status}
              </Button>
            </form>
          ))}
        </div>
      )}

      <form action={updateThisDocument} className="mt-6">
        <FieldGroup>
          {config.fields.map((field) => (
            <FieldInput
              key={field.name}
              field={field}
              defaultValue={data[field.name]}
              disabled={!canUpdate}
            />
          ))}
        </FieldGroup>
        {canUpdate && (
          <Button type="submit" className="mt-6">
            Save
          </Button>
        )}
      </form>
    </div>
  );
}
