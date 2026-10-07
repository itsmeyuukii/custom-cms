import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { collectionRegistry } from "@/collections/registry";
import { hasCollectionAccess } from "@/collections/access";
import { ButtonLink } from "@/components/ui/button";
import { TextLink } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from "@/components/ui/table";

const statusColors = {
  DRAFT: "yellow",
  PUBLISHED: "green",
  ARCHIVED: "zinc",
} as const;

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
        <h1 className="text-2xl font-semibold text-zinc-900">{labelPlural}</h1>
        {canCreate && (
          <ButtonLink href={`/admin/${slug}/new`}>
            New {config.label}
          </ButtonLink>
        )}
      </div>

      <Table className="mt-6">
        <TableHead>
          <TableRow header>
            <TableHeader>{config.slugField ? "Slug" : "ID"}</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader>Updated</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {documents.map((document) => (
            <TableRow key={document.id}>
              <TableCell>
                <TextLink href={`/admin/${slug}/${document.id}`}>
                  {document.slug ?? document.id}
                </TextLink>
              </TableCell>
              <TableCell>
                <Badge color={statusColors[document.status]}>
                  {document.status}
                </Badge>
              </TableCell>
              <TableCell className="text-zinc-500">
                {document.updatedAt.toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
          {documents.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="py-6 text-center text-zinc-400">
                No {labelPlural.toLowerCase()} yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
