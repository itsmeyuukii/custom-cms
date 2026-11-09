import { describe, expect, it } from "vitest";
import {
  closeSchema,
  MAX_BLOCK_DATA_BYTES,
  validateBlockData,
} from "./block-validation";

// The seeded schemas (prisma/seed.ts), so the tests cover real components.
const heroSchema = {
  type: "object",
  properties: {
    heading: { type: "string" },
    subheading: { type: "string" },
    ctaLabel: { type: "string" },
    ctaHref: { type: "string" },
  },
  required: ["heading"],
};

const cardGridSchema = {
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
};

describe("closeSchema", () => {
  it("closes the top-level object and nested ones, including array items", () => {
    expect(closeSchema(cardGridSchema)).toEqual({
      type: "object",
      additionalProperties: false,
      properties: {
        cards: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              imageUrl: { type: "string" },
            },
            required: ["title"],
          },
        },
      },
    });
  });

  it("closes object schemas inside allOf, anyOf and oneOf", () => {
    const closed = closeSchema({
      anyOf: [{ type: "object", properties: { a: { type: "string" } } }],
      allOf: [{ type: "object" }],
      oneOf: [{ type: "string" }],
    });

    expect(closed).toEqual({
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          properties: { a: { type: "string" } },
        },
      ],
      allOf: [{ type: "object", additionalProperties: false }],
      oneOf: [{ type: "string" }],
    });
  });

  it("leaves an explicit additionalProperties alone", () => {
    const open = { type: "object", additionalProperties: true };
    const typed = {
      type: "object",
      additionalProperties: { type: "number" },
    };

    expect(closeSchema(open)).toEqual(open);
    expect(closeSchema(typed)).toEqual(typed);
  });

  it("doesn't modify the schema it's given", () => {
    const schema = structuredClone(heroSchema);

    closeSchema(schema);

    expect(schema).toEqual(heroSchema);
  });
});

describe("validateBlockData", () => {
  it("accepts data that matches the schema", () => {
    expect(
      validateBlockData(heroSchema, {
        heading: "Hello",
        ctaLabel: "Go",
        ctaHref: "/go",
      }),
    ).toEqual({ ok: true });
    expect(
      validateBlockData(cardGridSchema, { cards: [{ title: "One" }] }),
    ).toEqual({ ok: true });
  });

  it("rejects a missing required prop", () => {
    expect(validateBlockData(heroSchema, { subheading: "x" })).toEqual({
      ok: false,
      message: "(root): must have required property 'heading'",
    });
  });

  it("rejects a wrong type, with the path to it", () => {
    expect(validateBlockData(cardGridSchema, { cards: "x" })).toEqual({
      ok: false,
      message: "cards: must be array",
    });
    expect(
      validateBlockData(cardGridSchema, { cards: [{ title: 1 }] }),
    ).toEqual({ ok: false, message: "cards.0.title: must be string" });
  });

  it("rejects a prop the schema doesn't declare, at any level", () => {
    expect(validateBlockData(heroSchema, { heading: "Hi", foo: 1 })).toEqual({
      ok: false,
      message: "foo: is not an allowed property",
    });
    expect(
      validateBlockData(cardGridSchema, {
        cards: [{ title: "One", onClick: "x" }],
      }),
    ).toEqual({
      ok: false,
      message: "cards.0.onClick: is not an allowed property",
    });
  });

  it("reports every problem, not just the first", () => {
    const result = validateBlockData(heroSchema, { heading: 1, foo: 1 });

    expect(result).toEqual({
      ok: false,
      message: "foo: is not an allowed property; heading: must be string",
    });
  });

  it("rejects data over the size cap before validating it", () => {
    const big = { heading: "x".repeat(MAX_BLOCK_DATA_BYTES) };

    expect(validateBlockData(heroSchema, big)).toEqual({
      ok: false,
      message: `Block data is too large (max ${MAX_BLOCK_DATA_BYTES / 1024} KB)`,
    });
  });

  it("measures the cap in bytes, not characters", () => {
    // "é" is 2 bytes in UTF-8: under the cap in characters, over it in bytes.
    const heading = "é".repeat(MAX_BLOCK_DATA_BYTES / 2);

    expect(validateBlockData(heroSchema, { heading }).ok).toBe(false);
  });

  it("throws for a schema with an unknown keyword instead of validating nothing", () => {
    expect(() =>
      validateBlockData({ type: "object", propertees: {} }, {}),
    ).toThrow(/propertees/);
  });
});
