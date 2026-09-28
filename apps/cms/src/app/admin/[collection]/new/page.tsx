import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { collectionRegistry } from "@/collections/registry";
import { hasCollectionAccess } from "@/collections/access";
import { FieldInput } from "@/collections/FieldInput";
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
      <h1 className="text-2xl font-semibold">New {config.label}</h1>
      <form action={createThisDocument} className="mt-6 space-y-4">
        {config.fields.map((field) => (
          <FieldInput key={field.name} field={field} />
        ))}
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-sm text-white"
        >
          Create
        </button>
      </form>
    </div>
  );
}
