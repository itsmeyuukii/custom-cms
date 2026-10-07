import { expect, test } from "@playwright/test";
import { login, loginAndWait, logout } from "./fixtures";

test.describe("auth", () => {
  test("logged-out visitors are redirected from /admin/* to /login", async ({
    page,
  }) => {
    for (const path of ["/admin", "/admin/pages", "/admin/media"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  test("wrong password shows an error and stays on /login", async ({
    page,
  }) => {
    await login(page, "admin", "definitely-not-the-password");
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("admin can log in and sees their role on the dashboard", async ({
    page,
  }) => {
    await loginAndWait(page, "admin");
    await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();
    await expect(page.getByText("Roles: admin")).toBeVisible();
  });

  test("logging out ends the session", async ({ page }) => {
    await loginAndWait(page, "editor");
    await logout(page);

    await page.goto("/admin/pages");
    await expect(page).toHaveURL(/\/login$/);
  });
});
