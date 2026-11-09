// Throwaway RBAC rows for integration tests (docs/UNIT_TESTING_PLAN.md §4).
// Every key and slug is unique per call, so tests never collide with seed
// data or each other, and cleanup deletes exactly what was created.

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function createPermission() {
  const key = `test:${randomUUID()}`;
  await prisma.permission.create({
    data: { key, label: key, group: "test" },
  });
  return key;
}

/** A role granting exactly `permissionKeys` (which must already exist). */
export async function createRole(permissionKeys: string[] = []) {
  const slug = `test-${randomUUID()}`;
  await prisma.role.create({
    data: {
      name: slug,
      slug,
      permissions: {
        create: permissionKeys.map((key) => ({
          permission: { connect: { key } },
        })),
      },
    },
  });
  return slug;
}

/** Deletes test roles and permissions; RolePermission rows cascade. */
export async function cleanupRbac(
  roleSlugs: string[],
  permissionKeys: string[],
) {
  await prisma.role.deleteMany({ where: { slug: { in: roleSlugs } } });
  await prisma.permission.deleteMany({
    where: { key: { in: permissionKeys } },
  });
}
