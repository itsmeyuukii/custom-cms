import { expect, test } from "@playwright/test";
import { loginAndWait } from "./fixtures";

test.describe("posts (collection)", () => {
  test("editor creates a post, then edits it", async ({ page }) => {
    const slug = `e2e-post-${Date.now()}`;
    const title = `E2E Post ${slug}`;

    await loginAndWait(page, "editor");

    // Create: goes through createDocument (Zod, block check, uniqueness).
    await page.goto("/admin/posts/new");
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Slug").fill(slug);
    await page.getByLabel("Body").fill("Written by the e2e suite.");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page).toHaveURL(/\/admin\/posts\/(?!new$)[^/]+$/);
    await expect(page.getByLabel("Title")).toHaveValue(title);

    // Edit: goes through updateDocument, then survives a reload.
    // The input already shows the typed value, so wait for the server
    // action's response itself before reloading, or the reload races it.
    await page.getByLabel("Title").fill(`${title} (edited)`);
    const saved = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().endsWith(new URL(page.url()).pathname),
    );
    await page.getByRole("button", { name: "Save" }).click();
    expect((await saved).ok()).toBe(true);
    await page.reload();
    await expect(page.getByLabel("Title")).toHaveValue(`${title} (edited)`);

    // Listed in the admin index (which shows slugs, not titles).
    await page.goto("/admin/posts");
    await expect(page.getByRole("row").filter({ hasText: slug })).toContainText(
      "DRAFT",
    );
  });
});
