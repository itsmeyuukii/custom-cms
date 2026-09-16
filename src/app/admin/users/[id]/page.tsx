import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { updateUserRoles } from "../actions";

export default async function EditUser({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!(await hasPermission(session?.user?.roleSlugs, "users:manage")))
    redirect("/admin");

  const [user, roles] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        roles: { select: { roleId: true } },
      },
    }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!user) notFound();

  const checkedIds = new Set(user.roles.map((r) => r.roleId));
  const updateThisUser = updateUserRoles.bind(null, user.id);

  return (
    <div className="max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">{user.name ?? user.email}</h1>
        <p className="text-sm text-gray-500">{user.email}</p>
      </div>

      <form action={updateThisUser} className="mt-6 space-y-6">
        <div>
          <h2 className="font-semibold">Roles</h2>
          <div className="mt-2 space-y-1">
            {roles.map((role) => (
              <label key={role.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="roleIds"
                  value={role.id}
                  defaultChecked={checkedIds.has(role.id)}
                />
                {role.name}
                {role.description && (
                  <span className="text-gray-400">{role.description}</span>
                )}
              </label>
            ))}
            {roles.length === 0 && (
              <p className="text-sm text-gray-400">No roles exist yet.</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-sm text-white"
        >
          Save
        </button>
      </form>
    </div>
  );
}
