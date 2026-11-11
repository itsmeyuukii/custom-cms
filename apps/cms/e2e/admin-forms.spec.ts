import { expect, test } from "@playwright/test";
import { loginAndWait } from "./fixtures";

// Rejected Roles/Users saves show the reason on the form instead of a
// generic error screen (docs/FORM_ERRORS_PLAN.md). The lockout cases are
// rejected before anything is written, so they leave the seed intact.
test.describe("admin form errors", () => {
  test("creating a role with a slug that's taken says so", async ({ page }) => {
    const slug = `e2e-role-${Date.now()}`;

    await loginAndWait(page, "admin");
    for (const name of [`E2E ${slug}`, `E2E ${slug} again`]) {
      await page.goto("/admin/roles/new");
      await page.getByLabel("Name").fill(name);
      await page.getByLabel("Slug").fill(slug);
      await page.getByRole("button", { name: "Create" }).click();
      if (name === `E2E ${slug}`) {
        await expect(page).toHaveURL(/\/admin\/roles\/(?!new$)[^/]+$/);
      }
    }

    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
      "That slug is already in use",
    );
    await expect(page.getByLabel("Name")).toHaveValue(`E2E ${slug} again`);
  });

  test("removing roles:manage from the only role that has it is refused", async ({
    page,
  }) => {
    await loginAndWait(page, "admin");
    await page.goto("/admin/roles");
    await page.getByRole("link", { name: "Admin", exact: true }).click();

    const rolesManage = page.getByRole("checkbox", { name: /roles:manage/ });
    await rolesManage.uncheck();
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "This would leave no one able to manage roles",
    );
    await expect(rolesManage).not.toBeChecked();

    // Nothing was saved.
    await page.reload();
    await expect(rolesManage).toBeChecked();
  });

  test("removing the last admin's Admin role is refused", async ({ page }) => {
    await loginAndWait(page, "admin");
    await page.goto("/admin/users");
    await page
      .getByRole("row")
      .filter({ hasText: "admin@example.com" })
      .getByRole("link")
      .click();

    const adminRole = page.getByRole("checkbox", { name: /^Admin/ });
    await adminRole.uncheck();
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "This would leave no one able to manage users",
    );

    await page.reload();
    await expect(adminRole).toBeChecked();
  });

  test("an unexpected error shows the admin error screen with a reference", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const first = await context.newPage();
    await loginAndWait(first, "admin");

    const slug = `e2e-gone-${Date.now()}`;
    await first.goto("/admin/posts/new");
    await first.getByLabel("Title").fill(`E2E ${slug}`);
    await first.getByLabel("Slug").fill(slug);
    await first.getByLabel("Body").fill("Deleted twice.");
    await first.getByRole("button", { name: "Create" }).click();
    await expect(first).toHaveURL(/\/admin\/posts\/(?!new$)[^/]+$/);

    // A second tab on the same post, then delete it from the first one.
    const second = await context.newPage();
    await second.goto(first.url());
    await first.getByRole("button", { name: "Delete" }).click();
    await expect(first).toHaveURL(/\/admin\/posts$/);

    // Deleting it again is not an input problem the form could explain.
    await second.getByRole("button", { name: "Delete" }).click();
    await expect(
      second.getByRole("heading", { name: "Something went wrong" }),
    ).toBeVisible();
    await expect(second.getByText(/^Reference:/)).toBeVisible();
    // Still inside the admin layout, so the sidebar stays usable.
    await expect(second.getByRole("link", { name: "Dashboard" })).toBeVisible();

    await context.close();
  });
});
