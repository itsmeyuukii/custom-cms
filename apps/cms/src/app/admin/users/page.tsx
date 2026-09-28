import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
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

export default async function AdminUsersList() {
  const session = await auth();
  if (!(await hasPermission(session?.user?.roleSlugs, "users:manage")))
    redirect("/admin");

  const users = await prisma.user.findMany({
    orderBy: { email: "asc" },
    include: {
      roles: { include: { role: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Users</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Assign or remove roles per user. Creating new users isn&apos;t built
        here yet.
      </p>

      <Table className="mt-6">
        <TableHead>
          <TableRow header>
            <TableHeader>Name</TableHeader>
            <TableHeader>Email</TableHeader>
            <TableHeader>Roles</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <TextLink href={`/admin/users/${user.id}`}>
                  {user.name ?? "—"}
                </TextLink>
              </TableCell>
              <TableCell className="text-zinc-500">{user.email}</TableCell>
              <TableCell>
                {user.roles.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((ur) => (
                      <Badge key={ur.roleId} color="indigo">
                        {ur.role.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-zinc-500">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="py-6 text-center text-zinc-400">
                No users yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
