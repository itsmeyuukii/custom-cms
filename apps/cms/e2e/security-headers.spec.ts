import { expect, test } from "@playwright/test";
import { loginAndWait } from "./fixtures";

// SECURITY_REVIEW #7: every response carries the security headers, and
// the CSP doesn't break the app it protects.
test.describe("security headers", () => {
  for (const path of ["/", "/login", "/api/v1/pages"]) {
    test(`are sent on ${path}`, async ({ request }) => {
      const response = await request.get(path);
      const headers = response.headers();

      expect(headers["content-security-policy"]).toContain(
        "frame-ancestors 'none'",
      );
      expect(headers["x-frame-options"]).toBe("DENY");
      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["referrer-policy"]).toBe(
        "strict-origin-when-cross-origin",
      );
    });
  }

  test("the CSP blocks nothing the admin uses", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (message) => {
      if (/Content Security Policy/i.test(message.text())) {
        violations.push(message.text());
      }
    });

    // Login (client component, hydration), then pages that use
    // ActionForm and the sidebar.
    await loginAndWait(page, "admin");
    for (const path of ["/admin/pages/new", "/admin/roles", "/admin/media"]) {
      await page.goto(path);
      await expect(page.getByRole("main")).toBeVisible();
    }
    // A client-side submit still works under the policy.
    await page.goto("/admin/pages/new");
    await page.getByLabel("Title").fill("CSP check");
    await page.getByLabel("Slug").fill(`e2e-csp-${Date.now()}`);
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page).toHaveURL(/\/admin\/pages\/(?!new$)[^/]+$/);

    expect(violations).toEqual([]);
  });
});
