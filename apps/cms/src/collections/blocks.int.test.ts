import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { UserError } from "@/lib/form-errors";
import { prisma } from "@/lib/prisma";
import { assertValidBlocks } from "./blocks";
import type { CollectionConfig } from "./types";

// A throwaway component with the seeded Hero schema, uniquely keyed.
const key = `test-${randomUUID()}`;

const config: CollectionConfig = {
  slug: "test",
  label: "Test",
  fields: [
    { name: "title", type: "text" },
    { name: "content", type: "blocks" },
    {
      name: "sections",
      type: "array",
      fields: [{ name: "content", type: "blocks" }],
    },
  ],
};

beforeAll(async () => {
  await prisma.component.create({
    data: {
      key,
      name: key,
      schema: {
        type: "object",
        properties: { heading: { type: "string" } },
        required: ["heading"],
      },
    },
  });
});

afterAll(async () => {
  await prisma.component.deleteMany({ where: { key } });
});

describe("assertValidBlocks", () => {
  it("accepts valid blocks at the top level and inside array fields", async () => {
    await expect(
      assertValidBlocks(config, {
        title: "Hi",
        content: [{ component: key, data: { heading: "One" } }],
        sections: [{ content: [{ component: key, data: { heading: "Two" } }] }],
      }),
    ).resolves.toBeUndefined();
  });

  it("accepts a document without any blocks", async () => {
    await expect(
      assertValidBlocks(config, { title: "Hi" }),
    ).resolves.toBeUndefined();
  });

  it("rejects block data that doesn't match the component, naming the block", async () => {
    await expect(
      assertValidBlocks(config, {
        content: [
          { component: key, data: { heading: "Fine" } },
          { component: key, data: { heading: "Hi", foo: 1 } },
        ],
      }),
    ).rejects.toThrow(
      `content.1: Invalid data for "${key}": foo: is not an allowed property`,
    );
  });

  it("rejects an unknown component key", async () => {
    await expect(
      assertValidBlocks(config, {
        content: [{ component: "no-such-component", data: {} }],
      }),
    ).rejects.toThrow('content.0: Unknown component "no-such-component"');
  });

  it("checks blocks nested inside array fields", async () => {
    await expect(
      assertValidBlocks(config, {
        sections: [
          { content: [{ component: key, data: { heading: "Fine" } }] },
          { content: [{ component: key, data: {} }] },
        ],
      }),
    ).rejects.toThrow(
      `sections.1.content.0: Invalid data for "${key}": (root): must have required property 'heading'`,
    );
  });

  it("keeps the error a UserError after adding the block's path", async () => {
    await expect(
      assertValidBlocks(config, { content: [{ component: key, data: {} }] }),
    ).rejects.toBeInstanceOf(UserError);
  });
});
