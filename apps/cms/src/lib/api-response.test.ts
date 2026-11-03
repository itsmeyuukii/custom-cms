import { describe, expect, it } from "vitest";
import { apiError, apiSuccess } from "./api-response";

describe("apiSuccess", () => {
  it("wraps data in the success envelope with status 200", async () => {
    const response = apiSuccess([{ id: 1 }]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [{ id: 1 }] });
  });

  it("includes meta when given", async () => {
    const response = apiSuccess([], { page: 2, pageSize: 10, total: 0 });

    expect(await response.json()).toEqual({
      data: [],
      meta: { page: 2, pageSize: 10, total: 0 },
    });
  });
});

describe("apiError", () => {
  it("wraps the code and message in the error envelope with the status", async () => {
    const response = apiError("NOT_FOUND", "Page not found", 404);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Page not found" },
    });
  });
});
