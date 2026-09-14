import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("changeme123", 10);

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

  await prisma.component.upsert({
    where: { key: "hero" },
    update: {},
    create: {
      key: "hero",
      name: "Hero",
      description: "Large banner with heading, subtext, and a call-to-action button.",
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
      description: "A responsive grid of cards, each with an image, title, and description.",
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

  console.log("Seeded admin user:", admin.email, "(password: changeme123)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
