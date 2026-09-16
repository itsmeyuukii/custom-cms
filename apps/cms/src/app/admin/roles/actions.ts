"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function createRole(formData: FormData) {
  await requirePermission("roles:manage");

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name || !slug) throw new Error("Name and slug are required");

  const role = await prisma.role.create({
    data: { name, slug, description: description || null },
  });

  revalidatePath("/admin/roles");
  redirect(`/admin/roles/${role.id}`);
}

/**
 * Would applying `newPermissionIds` to `roleId` leave nobody in the system
 * holding roles:manage? Checked before every save so an admin can't
 * accidentally lock everyone (including themselves) out of this page —
 * the open question RBAC_PLAN.md §"Open questions" flagged as worth
 * deciding before this UI shipped.
 */
async function wouldRemoveLastRolesManageHolder(
  roleId: string,
  newPermissionIds: string[],
): Promise<boolean> {
  const rolesManage = await prisma.permission.findUnique({
    where: { key: "roles:manage" },
  });
  if (!rolesManage) return false;

  const otherHolders = await prisma.role.count({
    where: {
      id: { not: roleId },
      users: { some: {} },
      permissions: { some: { permissionId: rolesManage.id } },
    },
  });
  if (otherHolders > 0) return false;

  const thisRoleKeepsIt = newPermissionIds.includes(rolesManage.id);
  if (thisRoleKeepsIt) return false;

  const thisRoleHasUsers = await prisma.userRole.count({ where: { roleId } });
  return thisRoleHasUsers > 0;
}

export async function updateRole(roleId: string, formData: FormData) {
  await requirePermission("roles:manage");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const permissionIds = formData.getAll("permissionIds").map(String);

  if (!name) throw new Error("Name is required");

  if (await wouldRemoveLastRolesManageHolder(roleId, permissionIds)) {
    throw new Error(
      "This would leave no one able to manage roles. Keep roles:manage " +
        "checked here, or grant it to another role with a user first.",
    );
  }

  await prisma.$transaction([
    prisma.role.update({
      where: { id: roleId },
      data: { name, description: description || null },
    }),
    prisma.rolePermission.deleteMany({
      where: { roleId, permissionId: { notIn: permissionIds } },
    }),
    ...permissionIds.map((permissionId) =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      }),
    ),
  ]);

  revalidatePath("/admin/roles");
  revalidatePath(`/admin/roles/${roleId}`);
}
