import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertValidBlock } from "./block-validation";
import { UserError } from "./form-errors";
import { prisma } from "./prisma";

// A throwaway component with the seeded Hero schema, uniquely keyed.
const key = `test-${randomUUID()}`;
let id: string;

beforeAll(async () => {
  const component = await prisma.component.create({
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
  id = component.id;
});

afterAll(async () => {
  await prisma.component.deleteMany({ where: { key } });
});

describe("assertValidBlock", () => {
  it("accepts valid data, looking the component up by id or by key", async () => {
    await expect(
      assertValidBlock({ id }, { heading: "Hi" }),
    ).resolves.toBeUndefined();
    await expect(
      assertValidBlock({ key }, { heading: "Hi" }),
    ).resolves.toBeUndefined();
  });

  it("throws a readable error naming the component for invalid data", async () => {
    await expect(
      assertValidBlock({ id }, { heading: 1, foo: 1 }),
    ).rejects.toThrow(
      `Invalid data for "${key}": foo: is not an allowed property; heading: must be string`,
    );
  });

  it("throws for a component that doesn't exist", async () => {
    await expect(
      assertValidBlock({ id: "missing" }, { heading: "Hi" }),
    ).rejects.toThrow('Unknown component "missing"');
    await expect(
      assertValidBlock({ key: "missing-key" }, { heading: "Hi" }),
    ).rejects.toThrow('Unknown component "missing-key"');
  });

  it("throws UserErrors, so admin forms can show the message", async () => {
    await expect(assertValidBlock({ id }, {})).rejects.toBeInstanceOf(
      UserError,
    );
    await expect(
      assertValidBlock({ id: "missing" }, {}),
    ).rejects.toBeInstanceOf(UserError);
  });
});
