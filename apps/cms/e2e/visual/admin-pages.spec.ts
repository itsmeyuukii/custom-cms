import { expect, test } from "@playwright/test";
import { loginAndWait } from "../fixtures";
import { expectPageScreenshot, skipUnlessLinux } from "./helpers";

skipUnlessLinux();

// Every page here only shows seeded data (three users, three system roles,
// no pages/posts/media), which is why this project runs before the
// functional specs. Detail views reached by clicking, since ids are cuids.

test.describe("visual: roles & users", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndWait(page, "admin");
  });

  test("roles list", async ({ page }) => {
    await page.goto("/admin/roles");
    await expect(page.getByRole("heading", { name: "Roles" })).toBeVisible();
    await expectPageScreenshot(page, "roles.png");
  });

  test("role edit form", async ({ page }) => {
    await page.goto("/admin/roles");
    await page.getByRole("link", { name: "Editor", exact: true }).click();
    await expect(page.getByLabel("Name")).toHaveValue("Editor");
    await expectPageScreenshot(page, "role-edit.png");
  });

  test("users list", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    await expectPageScreenshot(page, "users.png");
  });

  test("user role assignment form", async ({ page }) => {
    await page.goto("/admin/users");
    await page.getByRole("link", { name: "Editor", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/users\/[^/]+$/);
    await expect(page.getByText("editor@example.com")).toBeVisible();
    await expectPageScreenshot(page, "user-edit.png");
  });
});

test.describe("visual: content", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndWait(page, "editor");
  });

  test("media library with upload form", async ({ page }) => {
    await page.goto("/admin/media");
    await expect(page.getByText("No media yet.")).toBeVisible();
    await expectPageScreenshot(page, "media.png");
  });

  test("pages list, empty", async ({ page }) => {
    await page.goto("/admin/pages");
    await expect(page.getByText("No pages yet.")).toBeVisible();
    await expectPageScreenshot(page, "pages.png");
  });

  test("new page form", async ({ page }) => {
    await page.goto("/admin/pages/new");
    await expect(page.getByLabel("Title")).toBeVisible();
    await expectPageScreenshot(page, "page-new.png");
  });

  test("posts list, empty", async ({ page }) => {
    await page.goto("/admin/posts");
    await expect(page.getByRole("heading", { name: "Posts" })).toBeVisible();
    await expectPageScreenshot(page, "posts.png");
  });

  test("new post form", async ({ page }) => {
    await page.goto("/admin/posts/new");
    await expect(page.getByLabel("Title")).toBeVisible();
    await expectPageScreenshot(page, "post-new.png");
  });
});
