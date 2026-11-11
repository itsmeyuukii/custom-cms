import { describe, expect, it } from "vitest";
import { UserError } from "@/lib/form-errors";
import { parseDocumentFormData } from "./formData";
import type { CollectionConfig, Field } from "./types";

function parse(fields: Field[], entries: [string, string][]) {
  const config: CollectionConfig = { slug: "test", label: "Test", fields };
  const formData = new FormData();
  for (const [name, value] of entries) formData.append(name, value);
  return parseDocumentFormData(config, formData);
}

describe("parseDocumentFormData", () => {
  it("trims text and drops empty or missing values", () => {
    const fields: Field[] = [
      { name: "title", type: "text" },
      { name: "excerpt", type: "textarea" },
      { name: "body", type: "richText" },
    ];

    expect(
      parse(fields, [
        ["title", "  Hello  "],
        ["excerpt", "   "],
      ]),
    ).toEqual({ title: "Hello" });
  });

  it("converts numbers and drops blank ones", () => {
    const fields: Field[] = [
      { name: "rating", type: "number" },
      { name: "order", type: "number" },
    ];

    expect(
      parse(fields, [
        ["rating", "4.5"],
        ["order", " "],
      ]),
    ).toEqual({ rating: 4.5 });
  });

  it('treats a checkbox as true only when it is "on"', () => {
    const fields: Field[] = [
      { name: "featured", type: "boolean" },
      { name: "hidden", type: "boolean" },
    ];

    expect(parse(fields, [["featured", "on"]])).toEqual({
      featured: true,
      hidden: false,
    });
  });

  it("keeps date strings as they are and drops blank ones", () => {
    const fields: Field[] = [
      { name: "publishedAt", type: "date" },
      { name: "updatedOn", type: "date" },
    ];

    expect(
      parse(fields, [
        ["publishedAt", "2026-11-04"],
        ["updatedOn", ""],
      ]),
    ).toEqual({ publishedAt: "2026-11-04" });
  });

  it("collects every selected value for a multi-select", () => {
    const options = [
      { label: "Red", value: "red" },
      { label: "Blue", value: "blue" },
    ];
    const fields: Field[] = [
      { name: "color", type: "select", options },
      { name: "colors", type: "select", options, many: true },
      { name: "none", type: "select", options, many: true },
    ];

    expect(
      parse(fields, [
        ["color", "red"],
        ["colors", "red"],
        ["colors", "blue"],
      ]),
    ).toEqual({ color: "red", colors: ["red", "blue"] });
  });

  it("splits many-relationship ids on new lines", () => {
    const fields: Field[] = [
      { name: "author", type: "relationship", to: "users" },
      { name: "tags", type: "relationship", to: "tags", many: true },
    ];

    expect(
      parse(fields, [
        ["author", " u1 "],
        ["tags", "t1\n\n  t2  \r\nt3"],
      ]),
    ).toEqual({ author: "u1", tags: ["t1", "t2", "t3"] });
  });

  it("trims an upload's media id", () => {
    expect(
      parse([{ name: "cover", type: "upload" }], [["cover", " m1 "]]),
    ).toEqual({ cover: "m1" });
  });

  it("parses JSON for array and blocks fields", () => {
    const fields: Field[] = [
      { name: "links", type: "array", fields: [] },
      { name: "content", type: "blocks" },
    ];

    expect(
      parse(fields, [
        ["links", '[{"label":"Home"}]'],
        ["content", "  "],
      ]),
    ).toEqual({ links: [{ label: "Home" }] });
  });

  it("names the field in the error when its JSON is invalid", () => {
    const fields: Field[] = [
      { name: "links", label: "Footer links", type: "array", fields: [] },
    ];

    expect(() => parse(fields, [["links", "{not json"]])).toThrow(
      '"Footer links" must be valid JSON',
    );
  });

  it("throws a UserError for invalid JSON, so the form can show it", () => {
    const fields: Field[] = [{ name: "links", type: "array", fields: [] }];

    expect(() => parse(fields, [["links", "{not json"]])).toThrow(UserError);
  });
});
