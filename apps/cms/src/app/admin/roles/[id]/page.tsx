import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { updateRole } from "../actions";

export default async function EditRole({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!(await hasPermission(session?.user?.roleSlugs, "roles:manage")))
    redirect("/admin");

  const [role, permissions] = await Promise.all([
    prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { select: { permissionId: true } },
        _count: { select: { users: true } },
      },
    }),
    prisma.permission.findMany({
      orderBy: [{ group: "asc" }, { label: "asc" }],
    }),
  ]);

  if (!role) notFound();

  const checkedIds = new Set(role.permissions.map((p) => p.permissionId));

  const groups = new Map<string, typeof permissions>();
  for (const permission of permissions) {
    const group = groups.get(permission.group) ?? [];
    group.push(permission);
    groups.set(permission.group, group);
  }

  const updateThisRole = updateRole.bind(null, role.id);

  return (
    <div className="max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">
          {role.name}
          {role.isSystem && (
            <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-normal text-gray-500">
              system
            </span>
          )}
        </h1>
        <p className="text-sm text-gray-500">
          {role.slug} · {role._count.users} user
          {role._count.users === 1 ? "" : "s"}
        </p>
      </div>

      <form action={updateThisRole} className="mt-6 space-y-6">
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input
            name="name"
            defaultValue={role.name}
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea
            name="description"
            defaultValue={role.description ?? ""}
            rows={2}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <h2 className="font-semibold">Permissions</h2>
          <div className="mt-2 space-y-4">
            {[...groups.entries()].map(([group, groupPermissions]) => (
              <div key={group}>
                <h3 className="text-sm font-medium text-gray-500">{group}</h3>
                <div className="mt-1 space-y-1">
                  {groupPermissions.map((permission) => (
                    <label
                      key={permission.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        name="permissionIds"
                        value={permission.id}
                        defaultChecked={checkedIds.has(permission.id)}
                      />
                      {permission.label}
                      <span className="text-gray-400">({permission.key})</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
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
