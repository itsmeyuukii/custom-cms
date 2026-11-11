import { expect, test } from "@playwright/test";
import { loginAndWait } from "./fixtures";

test.describe("pages", () => {
  test("editor creates a page, adds a block, publishes it, then archives it", async ({
    page,
  }) => {
    const slug = `e2e-page-${Date.now()}`;
    const title = `E2E Page ${slug}`;
    const heading = `Hello from ${slug}`;

    await loginAndWait(page, "editor");

    // Create
    await page.goto("/admin/pages/new");
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Slug").fill(slug);
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page).toHaveURL(/\/admin\/pages\/(?!new$)[^/]+$/);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText("DRAFT", { exact: true })).toBeVisible();

    // A draft is never served publicly.
    expect((await page.request.get(`/${slug}`)).status()).toBe(404);

    // Add a block
    await page.getByLabel("Component").selectOption({ label: "Hero" });
    await page.getByLabel("Data (JSON)").fill(JSON.stringify({ heading }));
    await page.getByRole("button", { name: "Add Block" }).click();
    await expect(page.locator("li pre")).toContainText(heading);

    // Publish: status flips, the public route now renders the block
    await page.getByRole("button", { name: "Set PUBLISHED" }).click();
    await expect(
      page.getByRole("button", { name: "Set PUBLISHED" }),
    ).toBeDisabled();
    await expect(page.getByRole("link", { name: /View live/ })).toBeVisible();

    const live = await page.request.get(`/${slug}`);
    expect(live.status()).toBe(200);
    expect(await live.text()).toContain(heading);

    // Listed in the admin index with its status
    await page.goto("/admin/pages");
    const row = page.getByRole("row").filter({ hasText: `/${slug}` });
    await expect(row).toContainText("PUBLISHED");

    // Archive: pulled from the public site again
    await row.getByRole("link", { name: title }).click();
    await page.getByRole("button", { name: "Set ARCHIVED" }).click();
    await expect(
      page.getByRole("button", { name: "Set ARCHIVED" }),
    ).toBeDisabled();
    expect((await page.request.get(`/${slug}`)).status()).toBe(404);
  });

  test("a block whose data doesn't match its component's schema is not added", async ({
    page,
  }) => {
    const slug = `e2e-invalid-block-${Date.now()}`;

    await loginAndWait(page, "editor");
    await page.goto("/admin/pages/new");
    await page.getByLabel("Title").fill(`E2E ${slug}`);
    await page.getByLabel("Slug").fill(slug);
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page).toHaveURL(/\/admin\/pages\/(?!new$)[^/]+$/);
    const pageUrl = page.url();

    // Hero requires `heading`, and `onClick` isn't one of its props.
    const invalid = JSON.stringify({ subheading: "no heading", onClick: "x" });
    await page.getByLabel("Component").selectOption({ label: "Hero" });
    await page.getByLabel("Data (JSON)").fill(invalid);
    await page.getByRole("button", { name: "Add Block" }).click();

    // The editor sees why, and keeps what they typed to fix it.
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      `Invalid data for "hero": (root): must have required property 'heading'; onClick: is not an allowed property`,
    );
    await expect(page.getByLabel("Data (JSON)")).toHaveValue(invalid);

    await page.goto(pageUrl);
    await expect(page.getByText("No blocks yet.")).toBeVisible();
  });

  test("creating a page with a slug that's taken says so", async ({ page }) => {
    const slug = `e2e-dup-${Date.now()}`;

    await loginAndWait(page, "editor");
    for (const attempt of [1, 2]) {
      await page.goto("/admin/pages/new");
      await page.getByLabel("Title").fill(`E2E ${slug} ${attempt}`);
      await page.getByLabel("Slug").fill(slug);
      await page.getByRole("button", { name: "Create" }).click();
      if (attempt === 1) {
        await expect(page).toHaveURL(/\/admin\/pages\/(?!new$)[^/]+$/);
      }
    }

    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
      "That slug is already in use",
    );
    await expect(page).toHaveURL(/\/admin\/pages\/new$/);
    await expect(page.getByLabel("Title")).toHaveValue(`E2E ${slug} 2`);
  });

  test("viewer can open a page but has no write controls", async ({
    browser,
  }) => {
    // Editor creates the page the viewer will look at.
    const editorContext = await browser.newContext();
    const editor = await editorContext.newPage();
    await loginAndWait(editor, "editor");
    const slug = `e2e-viewer-${Date.now()}`;
    await editor.goto("/admin/pages/new");
    await editor.getByLabel("Title").fill(`E2E ${slug}`);
    await editor.getByLabel("Slug").fill(slug);
    await editor.getByRole("button", { name: "Create" }).click();
    await expect(editor).toHaveURL(/\/admin\/pages\/(?!new$)[^/]+$/);
    const detailUrl = editor.url();
    await editorContext.close();

    const viewerContext = await browser.newContext();
    const viewer = await viewerContext.newPage();
    await loginAndWait(viewer, "viewer");
    await viewer.goto(detailUrl);

    await expect(
      viewer.getByRole("heading", { name: `E2E ${slug}` }),
    ).toBeVisible();
    await expect(viewer.getByRole("button", { name: /^Set / })).toHaveCount(0);
    await expect(viewer.getByRole("button", { name: "Add Block" })).toHaveCount(
      0,
    );
    await viewerContext.close();
  });
});
