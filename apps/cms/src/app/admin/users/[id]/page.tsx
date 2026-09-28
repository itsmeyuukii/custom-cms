import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Checkbox, CheckboxField } from "@/components/ui/checkbox";
import { Text } from "@/components/ui/text";
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
        <h1 className="text-2xl font-semibold text-zinc-900">
          {user.name ?? user.email}
        </h1>
        <Text>{user.email}</Text>
      </div>

      <form action={updateThisUser} className="mt-6 space-y-6">
        <div>
          <h2 className="font-semibold text-zinc-900">Roles</h2>
          <div className="mt-2 space-y-1">
            {roles.map((role) => (
              <CheckboxField key={role.id}>
                <Checkbox
                  name="roleIds"
                  value={role.id}
                  defaultChecked={checkedIds.has(role.id)}
                />
                {role.name}
                {role.description && (
                  <span className="text-zinc-400">{role.description}</span>
                )}
              </CheckboxField>
            ))}
            {roles.length === 0 && (
              <Text className="text-zinc-400">No roles exist yet.</Text>
            )}
          </div>
        </div>

        <Button type="submit">Save</Button>
      </form>
    </div>
  );
}
