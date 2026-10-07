import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Field, FieldGroup, Label } from "@/components/ui/fieldset";
import { Badge } from "@/components/ui/badge";
import { Text, TextLink } from "@/components/ui/text";
import { addBlock, setPageStatus } from "../actions";

const statusColors = {
  DRAFT: "yellow",
  PUBLISHED: "green",
  ARCHIVED: "zinc",
} as const;

export default async function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [page, components, session] = await Promise.all([
    prisma.page.findUnique({
      where: { id },
      include: {
        blocks: { orderBy: { order: "asc" }, include: { component: true } },
      },
    }),
    prisma.component.findMany({ orderBy: { name: "asc" } }),
    auth(),
  ]);

  if (!page) notFound();

  const canWrite = await hasPermission(session?.user?.roleSlugs, "pages:edit");

  const addBlockToPage = addBlock.bind(null, page.id);

  return (
    <div className="max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">{page.title}</h1>
        <Text>
          /{page.slug}{" "}
          <Badge className="ml-1" color={statusColors[page.status]}>
            {page.status}
          </Badge>
        </Text>
      </div>

      {canWrite && (
        <div className="mt-4 flex gap-2">
          {(["DRAFT", "PUBLISHED", "ARCHIVED"] as const).map((status) => (
            <form
              key={status}
              action={setPageStatus.bind(null, page.id, status)}
            >
              <Button
                type="submit"
                variant="secondary"
                disabled={page.status === status}
              >
                Set {status}
              </Button>
            </form>
          ))}
        </div>
      )}

      <h2 className="mt-8 font-semibold text-zinc-900">Blocks</h2>
      <ul className="mt-2 space-y-2">
        {page.blocks.map((block) => (
          <li
            key={block.id}
            className="rounded-lg border border-zinc-200 p-3 text-sm"
          >
            <span className="font-medium text-zinc-900">
              {block.component.name}
            </span>
            <pre className="mt-1 overflow-x-auto text-xs text-zinc-500">
              {JSON.stringify(block.data, null, 2)}
            </pre>
          </li>
        ))}
        {page.blocks.length === 0 && (
          <li>
            <Text className="text-zinc-400">No blocks yet.</Text>
          </li>
        )}
      </ul>

      {canWrite && (
        <>
          <h2 className="mt-8 font-semibold text-zinc-900">Add Block</h2>
          <form action={addBlockToPage} className="mt-2">
            <FieldGroup>
              <Field>
                <Label htmlFor="componentId">Component</Label>
                <Select id="componentId" name="componentId" required>
                  {components.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field>
                <Label htmlFor="data">Data (JSON)</Label>
                <Textarea
                  id="data"
                  name="data"
                  rows={5}
                  defaultValue="{}"
                  className="font-mono text-xs"
                />
              </Field>
            </FieldGroup>
            <Button type="submit" className="mt-4">
              Add Block
            </Button>
          </form>
        </>
      )}

      {page.status === "PUBLISHED" && (
        <TextLink
          href={`/${page.slug}`}
          target="_blank"
          className="mt-6 inline-block text-sm"
        >
          View live →
        </TextLink>
      )}
    </div>
  );
}
