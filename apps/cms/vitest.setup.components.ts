// Setup for the `components` project (docs/UNIT_TESTING_PLAN.md §3):
// jest-dom matchers, and unmounting after each test since globals are off
// (Testing Library only auto-cleans when it can find a global afterEach).
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
