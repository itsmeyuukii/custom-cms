import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "html",
  // In CI a missing baseline must fail, not be written: with a retry, the
  // first attempt would write it and the second would pass against it.
  // Baselines come from the CI e2e job's "visual-baselines" artifact (see
  // docs/E2E_TESTING_PLAN.md §4), never from a Windows machine.
  updateSnapshots: process.env.CI ? "none" : "missing",
  use: {
    baseURL: "http://localhost:4001",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: "visual/**",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Screenshots only cover seeded data, so this project must run on a
      // freshly seeded database before the functional specs write to it.
      // CI runs it as its own step first; see .github/workflows/ci.yml.
      name: "visual",
      testDir: "./e2e/visual",
      use: {
        ...devices["Desktop Chrome"],
        locale: "en-US",
        timezoneId: "UTC",
      },
    },
  ],
  webServer: {
    command: "npm run start",
    url: "http://localhost:4001",
    reuseExistingServer: !process.env.CI,
    // Auth.js only auto-trusts the host on Vercel; a plain `next start`
    // on localhost otherwise 500s every /api/auth/* request (UntrustedHost).
    env: { AUTH_TRUST_HOST: "true" },
  },
});
