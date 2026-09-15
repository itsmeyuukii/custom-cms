import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = process.env.SEED_USER_PASSWORD;
  if (!password) {
    console.warn(
      'No SEED_USER_PASSWORD set - falling back to "changeme123". ' +
        "Fine for local dev, but set SEED_USER_PASSWORD to a real value " +
        "before seeding a shared or production database.",
    );
  }
  const passwordHash = await bcrypt.hash(password ?? "changeme123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin",
      role: "ADMIN",
      passwordHash,
    },
  });

  await prisma.user.upsert({
    where: { email: "editor@example.com" },
    update: {},
    create: {
      email: "editor@example.com",
      name: "Editor",
      role: "EDITOR",
      passwordHash,
    },
  });

  await prisma.user.upsert({
    where: { email: "viewer@example.com" },
    update: {},
    create: {
      email: "viewer@example.com",
      name: "Viewer",
      role: "VIEWER",
      passwordHash,
    },
  });

  await prisma.component.upsert({
    where: { key: "hero" },
    update: {},
    create: {
      key: "hero",
      name: "Hero",
      description:
        "Large banner with heading, subtext, and a call-to-action button.",
      schema: {
        type: "object",
        properties: {
          heading: { type: "string" },
          subheading: { type: "string" },
          ctaLabel: { type: "string" },
          ctaHref: { type: "string" },
        },
        required: ["heading"],
      },
    },
  });

  await prisma.component.upsert({
    where: { key: "card-grid" },
    update: {},
    create: {
      key: "card-grid",
      name: "Card Grid",
      description:
        "A responsive grid of cards, each with an image, title, and description.",
      schema: {
        type: "object",
        properties: {
          cards: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                imageUrl: { type: "string" },
              },
              required: ["title"],
            },
          },
        },
      },
    },
  });

  // --- RBAC v2 (docs/RBAC_PLAN.md) ---
  // Additive alongside the LegacyRole enum above: seeds the fixed
  // permission list, three system roles matching today's ADMIN/EDITOR/
  // VIEWER behavior, and backfills every user's UserRole from their
  // current enum value, so nothing regresses once call sites migrate
  // to requirePermission() (plan §6).

  const permissionDefs: { key: string; label: string; group: string }[] = [
    { key: "pages:create", label: "Create pages", group: "Pages" },
    { key: "pages:edit", label: "Edit pages", group: "Pages" },
    { key: "pages:publish", label: "Publish pages", group: "Pages" },
    { key: "pages:delete", label: "Delete pages", group: "Pages" },
    { key: "posts:create", label: "Create posts", group: "Posts" },
    { key: "posts:edit", label: "Edit posts", group: "Posts" },
    { key: "posts:publish", label: "Publish posts", group: "Posts" },
    { key: "posts:delete", label: "Delete posts", group: "Posts" },
    { key: "media:upload", label: "Upload media", group: "Media" },
    { key: "media:delete", label: "Delete media", group: "Media" },
    {
      key: "roles:manage",
      label: "Create and edit roles",
      group: "Administration",
    },
    {
      key: "users:manage",
      label: "Assign roles to users",
      group: "Administration",
    },
  ];

  const permissions = new Map<string, { id: string }>();
  for (const def of permissionDefs) {
    const permission = await prisma.permission.upsert({
      where: { key: def.key },
      update: { label: def.label, group: def.group },
      create: def,
    });
    permissions.set(def.key, permission);
  }

  async function upsertSystemRole(
    slug: string,
    name: string,
    description: string,
    permissionKeys: string[],
  ) {
    const role = await prisma.role.upsert({
      where: { slug },
      update: { name, description, isSystem: true },
      create: { slug, name, description, isSystem: true },
    });

    for (const key of permissionKeys) {
      const permission = permissions.get(key);
      if (!permission) throw new Error(`Unknown permission key: ${key}`);
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }

    return role;
  }

  const adminRole = await upsertSystemRole(
    "admin",
    "Admin",
    "Full access to every permission.",
    permissionDefs.map((d) => d.key),
  );
  const editorRole = await upsertSystemRole(
    "editor",
    "Editor",
    "Can create and edit pages/posts and upload media.",
    [
      "pages:create",
      "pages:edit",
      "posts:create",
      "posts:edit",
      "media:upload",
    ],
  );
  const viewerRole = await upsertSystemRole(
    "viewer",
    "Viewer",
    "Read-only access, matching today's default.",
    [],
  );

  const roleByLegacyRole = {
    ADMIN: adminRole,
    EDITOR: editorRole,
    VIEWER: viewerRole,
  } as const;

  const allUsers = await prisma.user.findMany({
    select: { id: true, role: true },
  });
  for (const user of allUsers) {
    const role = roleByLegacyRole[user.role];
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
  }

  console.log(
    "Seeded users:",
    admin.email,
    "(ADMIN),",
    "editor@example.com (EDITOR),",
    "viewer@example.com (VIEWER)",
  );
  console.log(
    "Seeded RBAC v2 roles: Admin, Editor, Viewer —",
    permissionDefs.length,
    "permissions, backfilled",
    allUsers.length,
    "user(s)",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
