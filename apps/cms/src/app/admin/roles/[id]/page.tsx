import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, Label } from "@/components/ui/fieldset";
import { Checkbox, CheckboxField } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
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
        <h1 className="text-2xl font-semibold text-zinc-900">
          {role.name}
          {role.isSystem && (
            <Badge className="ml-2 align-middle" color="zinc">
              system
            </Badge>
          )}
        </h1>
        <Text>
          {role.slug} · {role._count.users} user
          {role._count.users === 1 ? "" : "s"}
        </Text>
      </div>

      <form action={updateThisRole} className="mt-6 space-y-6">
        <FieldGroup>
          <Field>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={role.name} required />
          </Field>
          <Field>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={role.description ?? ""}
              rows={2}
            />
          </Field>
        </FieldGroup>

        <div>
          <h2 className="font-semibold text-zinc-900">Permissions</h2>
          <div className="mt-2 space-y-4">
            {[...groups.entries()].map(([group, groupPermissions]) => (
              <div key={group}>
                <h3 className="text-sm font-medium text-zinc-500">{group}</h3>
                <div className="mt-1 space-y-1">
                  {groupPermissions.map((permission) => (
                    <CheckboxField key={permission.id}>
                      <Checkbox
                        name="permissionIds"
                        value={permission.id}
                        defaultChecked={checkedIds.has(permission.id)}
                      />
                      {permission.label}
                      <span className="text-zinc-400">({permission.key})</span>
                    </CheckboxField>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button type="submit">Save</Button>
      </form>
    </div>
  );
}
