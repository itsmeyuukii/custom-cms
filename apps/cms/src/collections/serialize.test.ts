import type { Document, Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { documentToJson } from "./serialize";

function makeDocument(data: Prisma.JsonObject): Document {
  return {
    id: "doc_1",
    collection: "posts",
    slug: "hello",
    status: "PUBLISHED",
    data,
    authorId: "user_1",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
  };
}

describe("documentToJson", () => {
  it("flattens data alongside the document's own fields", () => {
    const json = documentToJson(
      makeDocument({ title: "Hello", body: "World" }),
    );

    expect(json).toEqual({
      id: "doc_1",
      title: "Hello",
      body: "World",
      slug: "hello",
      status: "PUBLISHED",
      authorId: "user_1",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-02T00:00:00Z"),
    });
  });

  it("keeps the document's own fields when data has the same keys", () => {
    const json = documentToJson(
      makeDocument({
        id: "spoofed",
        slug: "spoofed",
        status: "DRAFT",
        authorId: "spoofed",
        createdAt: "spoofed",
        updatedAt: "spoofed",
      }),
    );

    expect(json).toMatchObject({
      id: "doc_1",
      slug: "hello",
      status: "PUBLISHED",
      authorId: "user_1",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-02T00:00:00Z"),
    });
  });
});
