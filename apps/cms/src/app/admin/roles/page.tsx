import { redirect } from "next/navigation";
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

export default async function AdminRolesList() {
  const session = await auth();
  if (!(await hasPermission(session?.user?.roleSlugs, "roles:manage")))
    redirect("/admin");

  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { permissions: true, users: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Roles</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Named bundles of permissions.
          </p>
        </div>
        <ButtonLink href="/admin/roles/new">New role</ButtonLink>
      </div>

      <Table className="mt-6">
        <TableHead>
          <TableRow header>
            <TableHeader>Name</TableHeader>
            <TableHeader>Description</TableHeader>
            <TableHeader>Permissions</TableHeader>
            <TableHeader>Users</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {roles.map((role) => (
            <TableRow key={role.id}>
              <TableCell>
                <TextLink href={`/admin/roles/${role.id}`}>
                  {role.name}
                </TextLink>
                {role.isSystem && (
                  <Badge className="ml-2" color="zinc">
                    system
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-zinc-500">
                {role.description ?? "—"}
              </TableCell>
              <TableCell className="text-zinc-500">
                {role._count.permissions}
              </TableCell>
              <TableCell className="text-zinc-500">
                {role._count.users}
              </TableCell>
            </TableRow>
          ))}
          {roles.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="py-6 text-center text-zinc-400">
                No roles yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
