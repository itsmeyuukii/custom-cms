import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

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
      <h1 className="text-2xl font-semibold">Users</h1>
      <p className="mt-2 text-sm text-gray-500">
        Assign or remove roles per user. Creating new users isn&apos;t built
        here yet.
      </p>

      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="py-2">Name</th>
            <th className="py-2">Email</th>
            <th className="py-2">Roles</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-gray-100">
              <td className="py-2">
                <Link
                  href={`/admin/users/${user.id}`}
                  className="hover:underline"
                >
                  {user.name ?? "—"}
                </Link>
              </td>
              <td className="py-2 text-gray-500">{user.email}</td>
              <td className="py-2 text-gray-500">
                {user.roles.length > 0
                  ? user.roles.map((ur) => ur.role.name).join(", ")
                  : "—"}
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={3} className="py-6 text-center text-gray-400">
                No users yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
