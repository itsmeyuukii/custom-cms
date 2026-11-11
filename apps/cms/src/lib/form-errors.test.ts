import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { describe, expect, it } from "vitest";
import { toFormState, UserError } from "./form-errors";

/** The shape Prisma 7 + @prisma/adapter-pg actually throws (no meta.target). */
function uniqueViolation(model: string, index: string) {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "7.10.0",
    meta: {
      modelName: model,
      driverAdapterError: {
        name: "DriverAdapterError",
        cause: {
          kind: "UniqueConstraintViolation",
          constraint: { index },
          table: model,
        },
      },
    },
  });
}

describe("toFormState", () => {
  it("returns no error when the action succeeds", async () => {
    expect(await toFormState(async () => {})).toEqual({ error: null });
  });

  it("returns a UserError's message", async () => {
    expect(
      await toFormState(async () => {
        throw new UserError("Title and slug are required");
      }),
    ).toEqual({ error: "Title and slug are required" });
  });

  it("names the field of a unique-constraint violation", async () => {
    expect(
      await toFormState(async () => {
        throw uniqueViolation("Page", "Page_slug_key");
      }),
    ).toEqual({ error: "That slug is already in use" });
    expect(
      await toFormState(async () => {
        throw uniqueViolation("Role", "Role_name_key");
      }),
    ).toEqual({ error: "That name is already in use" });
  });

  it("names the last field of a compound unique constraint", async () => {
    expect(
      await toFormState(async () => {
        throw uniqueViolation("Document", "Document_collection_slug_key");
      }),
    ).toEqual({ error: "That slug is already in use" });
  });

  it("falls back to a generic message when the constraint can't be read", async () => {
    const error = new Prisma.PrismaClientKnownRequestError("Unique", {
      code: "P2002",
      clientVersion: "7.10.0",
    });

    expect(
      await toFormState(async () => {
        throw error;
      }),
    ).toEqual({ error: "That value is already in use" });
  });

  it("rethrows any other error, so its message never reaches the browser", async () => {
    await expect(
      toFormState(async () => {
        throw new Error("Forbidden: insufficient permissions");
      }),
    ).rejects.toThrow("Forbidden");

    const notFound = new Prisma.PrismaClientKnownRequestError("Not found", {
      code: "P2025",
      clientVersion: "7.10.0",
    });
    await expect(
      toFormState(async () => {
        throw notFound;
      }),
    ).rejects.toBe(notFound);
  });

  it("rethrows Next's redirect signal so redirects still work", async () => {
    await expect(
      toFormState(async () => {
        redirect("/admin/pages/1");
      }),
    ).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
  });
});
