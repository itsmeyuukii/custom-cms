import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

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
      <h1 className="text-2xl font-semibold">Roles</h1>
      <p className="mt-2 text-sm text-gray-500">
        Named bundles of permissions. Creating new roles isn&apos;t built yet —
        this lets you view and adjust what the existing roles can do.
      </p>

      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="py-2">Name</th>
            <th className="py-2">Description</th>
            <th className="py-2">Permissions</th>
            <th className="py-2">Users</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.id} className="border-b border-gray-100">
              <td className="py-2">
                <Link
                  href={`/admin/roles/${role.id}`}
                  className="hover:underline"
                >
                  {role.name}
                </Link>
                {role.isSystem && (
                  <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                    system
                  </span>
                )}
              </td>
              <td className="py-2 text-gray-500">{role.description ?? "—"}</td>
              <td className="py-2 text-gray-500">{role._count.permissions}</td>
              <td className="py-2 text-gray-500">{role._count.users}</td>
            </tr>
          ))}
          {roles.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-gray-400">
                No roles yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
