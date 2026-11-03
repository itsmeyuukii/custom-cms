import { describe, expect, it } from "vitest";
import type { CollectionConfig, Field } from "./types";
import { collectionToZod } from "./validation";

function schemaFor(...fields: Field[]) {
  const config: CollectionConfig = { slug: "test", label: "Test", fields };
  return collectionToZod(config);
}

describe("collectionToZod", () => {
  describe("text fields", () => {
    it("rejects an empty string when required", () => {
      const schema = schemaFor({ name: "title", type: "text", required: true });

      expect(schema.safeParse({ title: "" }).success).toBe(false);
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ title: "Hi" }).success).toBe(true);
    });

    it("allows the field to be absent when optional", () => {
      const schema = schemaFor({ name: "excerpt", type: "textarea" });

      expect(schema.safeParse({}).success).toBe(true);
    });

    it("enforces minLength and maxLength", () => {
      const schema = schemaFor({
        name: "code",
        type: "text",
        required: true,
        minLength: 2,
        maxLength: 4,
      });

      expect(schema.safeParse({ code: "a" }).success).toBe(false);
      expect(schema.safeParse({ code: "ab" }).success).toBe(true);
      expect(schema.safeParse({ code: "abcd" }).success).toBe(true);
      expect(schema.safeParse({ code: "abcde" }).success).toBe(false);
    });
  });

  it("enforces number min and max and rejects strings", () => {
    const schema = schemaFor({
      name: "rating",
      type: "number",
      required: true,
      min: 1,
      max: 5,
    });

    expect(schema.safeParse({ rating: 0 }).success).toBe(false);
    expect(schema.safeParse({ rating: 3 }).success).toBe(true);
    expect(schema.safeParse({ rating: 6 }).success).toBe(false);
    expect(schema.safeParse({ rating: "3" }).success).toBe(false);
  });

  it("requires a boolean for boolean fields", () => {
    const schema = schemaFor({
      name: "featured",
      type: "boolean",
      required: true,
    });

    expect(schema.safeParse({ featured: false }).success).toBe(true);
    expect(schema.safeParse({ featured: "true" }).success).toBe(false);
  });

  it("requires a parseable date string for date fields", () => {
    const schema = schemaFor({ name: "publishedAt", type: "date" });

    expect(schema.safeParse({ publishedAt: "2026-11-04" }).success).toBe(true);
    expect(schema.safeParse({ publishedAt: "not a date" }).success).toBe(false);
  });

  describe("select fields", () => {
    const options = [
      { label: "Red", value: "red" },
      { label: "Blue", value: "blue" },
    ];

    it("accepts only a configured option", () => {
      const schema = schemaFor({
        name: "color",
        type: "select",
        required: true,
        options,
      });

      expect(schema.safeParse({ color: "red" }).success).toBe(true);
      expect(schema.safeParse({ color: "green" }).success).toBe(false);
    });

    it("accepts an array of configured options when many", () => {
      const schema = schemaFor({
        name: "colors",
        type: "select",
        required: true,
        many: true,
        options,
      });

      expect(schema.safeParse({ colors: ["red", "blue"] }).success).toBe(true);
      expect(schema.safeParse({ colors: ["red", "green"] }).success).toBe(
        false,
      );
      expect(schema.safeParse({ colors: "red" }).success).toBe(false);
    });
  });

  it("takes an id, or a list of ids when many, for relationship fields", () => {
    const schema = schemaFor(
      { name: "author", type: "relationship", to: "users", required: true },
      {
        name: "tags",
        type: "relationship",
        to: "tags",
        many: true,
        required: true,
      },
    );

    expect(schema.safeParse({ author: "u1", tags: ["t1"] }).success).toBe(true);
    expect(schema.safeParse({ author: ["u1"], tags: ["t1"] }).success).toBe(
      false,
    );
    expect(schema.safeParse({ author: "u1", tags: "t1" }).success).toBe(false);
  });

  it("validates each item of an array field against its sub-fields", () => {
    const schema = schemaFor({
      name: "links",
      type: "array",
      required: true,
      fields: [
        { name: "label", type: "text", required: true },
        { name: "href", type: "text", required: true },
      ],
    });

    expect(
      schema.safeParse({ links: [{ label: "Home", href: "/" }] }).success,
    ).toBe(true);
    expect(schema.safeParse({ links: [{ label: "Home" }] }).success).toBe(
      false,
    );
  });

  describe("blocks fields", () => {
    it("accepts only allowed component keys", () => {
      const schema = schemaFor({
        name: "content",
        type: "blocks",
        required: true,
        allow: ["hero"],
      });

      expect(
        schema.safeParse({ content: [{ component: "hero", data: {} }] })
          .success,
      ).toBe(true);
      expect(
        schema.safeParse({ content: [{ component: "card-grid", data: {} }] })
          .success,
      ).toBe(false);
    });

    it("accepts any component key when allow is omitted", () => {
      const schema = schemaFor({
        name: "content",
        type: "blocks",
        required: true,
      });

      expect(
        schema.safeParse({ content: [{ component: "anything", data: 1 }] })
          .success,
      ).toBe(true);
    });
  });
});
