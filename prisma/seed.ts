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

  console.log(
    "Seeded users:",
    admin.email,
    "(ADMIN),",
    "editor@example.com (EDITOR),",
    "viewer@example.com (VIEWER)",
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
