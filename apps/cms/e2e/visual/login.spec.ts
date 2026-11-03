import { expect, test } from "@playwright/test";
import { login } from "../fixtures";
import { expectPageScreenshot, skipUnlessLinux } from "./helpers";

skipUnlessLinux();

test.describe("visual: login", () => {
  test("empty form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expectPageScreenshot(page, "login.png");
  });

  test("invalid credentials error", async ({ page }) => {
    await login(page, "admin", "definitely-not-the-password");
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
    await expectPageScreenshot(page, "login-error.png");
  });
});
