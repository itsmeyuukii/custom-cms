"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

/**
 * Would giving `userId` exactly `newRoleIds` leave nobody in the system
 * holding `permissionKey`? Checked for both users:manage and roles:manage
 * before every save, so an admin can't strand either admin page with no
 * one able to reach it (see docs/RBAC_PLAN.md's "Open questions" —
 * resolved to guard both, not just users:manage, since a roles:manage
 * lockout has no recovery path through /admin/users either).
 */
async function wouldOrphanPermission(
  userId: string,
  newRoleIds: string[],
  permissionKey: string,
): Promise<boolean> {
  const permission = await prisma.permission.findUnique({
    where: { key: permissionKey },
  });
  if (!permission) return false;

  const otherHolders = await prisma.user.count({
    where: {
      id: { not: userId },
      roles: {
        some: {
          role: { permissions: { some: { permissionId: permission.id } } },
        },
      },
    },
  });
  if (otherHolders > 0) return false;

  const newRolesGrantIt = await prisma.role.count({
    where: {
      id: { in: newRoleIds },
      permissions: { some: { permissionId: permission.id } },
    },
  });
  return newRolesGrantIt === 0;
}

export async function updateUserRoles(userId: string, formData: FormData) {
  await requirePermission("users:manage");

  const roleIds = formData.getAll("roleIds").map(String);

  for (const key of ["users:manage", "roles:manage"] as const) {
    if (await wouldOrphanPermission(userId, roleIds, key)) {
      throw new Error(
        `This would leave no one able to manage ${key === "users:manage" ? "users" : "roles"}. ` +
          `Keep a role granting ${key} assigned here, or grant it to another user first.`,
      );
    }
  }

  await prisma.$transaction([
    prisma.userRole.deleteMany({
      where: { userId, roleId: { notIn: roleIds } },
    }),
    ...roleIds.map((roleId) =>
      prisma.userRole.upsert({
        where: { userId_roleId: { userId, roleId } },
        update: {},
        create: { userId, roleId },
      }),
    ),
  ]);

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}
