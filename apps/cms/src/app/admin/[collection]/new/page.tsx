import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { collectionRegistry } from "@/collections/registry";
import { hasCollectionAccess } from "@/collections/access";
import { FieldInput } from "@/collections/FieldInput";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/fieldset";
import { createDocumentAction } from "../actions";

export default async function NewDocument({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection: slug } = await params;

  const config = collectionRegistry[slug];
  if (!config) notFound();

  const session = await auth();
  const canCreate = await hasCollectionAccess(
    session?.user?.roleSlugs,
    config,
    "create",
  );
  if (!canCreate) redirect(`/admin/${slug}`);

  const createThisDocument = createDocumentAction.bind(null, slug);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-zinc-900">
        New {config.label}
      </h1>
      <form action={createThisDocument} className="mt-6">
        <FieldGroup>
          {config.fields.map((field) => (
            <FieldInput key={field.name} field={field} />
          ))}
        </FieldGroup>
        <Button type="submit" className="mt-6">
          Create
        </Button>
      </form>
    </div>
  );
}
