import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
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

export default async function AdminPagesList() {
  const [pages, session] = await Promise.all([
    prisma.page.findMany({ orderBy: { updatedAt: "desc" } }),
    auth(),
  ]);
  const canWrite = await hasPermission(
    session?.user?.roleSlugs,
    "pages:create",
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Pages</h1>
        {canWrite && <ButtonLink href="/admin/pages/new">New Page</ButtonLink>}
      </div>

      <Table className="mt-6">
        <TableHead>
          <TableRow header>
            <TableHeader>Title</TableHeader>
            <TableHeader>Slug</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader>Updated</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {pages.map((page) => (
            <TableRow key={page.id}>
              <TableCell>
                <TextLink href={`/admin/pages/${page.id}`}>
                  {page.title}
                </TextLink>
              </TableCell>
              <TableCell className="text-zinc-500">/{page.slug}</TableCell>
              <TableCell>
                <Badge color={statusColors[page.status]}>{page.status}</Badge>
              </TableCell>
              <TableCell className="text-zinc-500">
                {page.updatedAt.toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
          {pages.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="py-6 text-center text-zinc-400">
                No pages yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
