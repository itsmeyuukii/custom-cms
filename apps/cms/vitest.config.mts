// Vitest projects are picked by file suffix (docs/UNIT_TESTING_PLAN.md §2).
// Playwright owns e2e/; everything here lives under src/.
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.int.test.ts"],
        },
      },
    ],
  },
});
