import { expect, test } from "@playwright/test";
import { loginAndWait } from "../fixtures";
import { expectPageScreenshot, skipUnlessLinux } from "./helpers";

skipUnlessLinux();

test.describe("visual: admin shell", () => {
  test("admin dashboard, full sidebar", async ({ page }) => {
    await loginAndWait(page, "admin");
    await expectPageScreenshot(page, "dashboard-admin.png");
  });

  test("viewer dashboard, no Roles or Users", async ({ page }) => {
    await loginAndWait(page, "viewer");
    await expectPageScreenshot(page, "dashboard-viewer.png");
  });

  test("user menu open", async ({ page }) => {
    await loginAndWait(page, "admin");
    await page
      .getByRole("button")
      .filter({ hasText: /^[A-Z?]{1,2}$/ })
      .click();
    await expect(
      page.getByRole("menuitem", { name: "Sign out" }),
    ).toBeVisible();
    // No mouse move here: moving off the menu could close it.
    await expect(page).toHaveScreenshot("user-menu.png");
  });
});
