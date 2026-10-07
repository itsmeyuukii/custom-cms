import { expect, test, type Page } from "@playwright/test";
import { loginAndWait } from "./fixtures";

/**
 * Reads the Server Action id that the "New Page" form is bound to, so a
 * test can replay the action with a different session's cookies - the
 * point being to prove the server rejects it, not just that the UI hides
 * the button.
 */
async function createPageActionField(page: Page) {
  await page.goto("/admin/pages/new");
  const name = await page
    .locator('input[type="hidden"][name^="$ACTION_ID_"]')
    .first()
    .getAttribute("name");
  expect(name).toBeTruthy();
  return name as string;
}

function postCreatePage(page: Page, actionField: string, slug: string) {
  return page.request.post("/admin/pages/new", {
    multipart: { [actionField]: "", title: `E2E ${slug}`, slug },
    maxRedirects: 0,
  });
}

async function pageSlugsVisibleTo(page: Page) {
  await page.goto("/admin/pages");
  return page.locator("tbody td:nth-child(2)").allTextContents();
}

test.describe("rbac", () => {
  test("viewer sees no write controls and is redirected from /admin/pages/new", async ({
    page,
  }) => {
    await loginAndWait(page, "viewer");

    await page.goto("/admin/pages");
    await expect(page.getByRole("heading", { name: "Pages" })).toBeVisible();
    await expect(page.getByRole("link", { name: "New Page" })).toHaveCount(0);

    await page.goto("/admin/pages/new");
    await expect(page).toHaveURL(/\/admin\/pages$/);
  });

  test("viewer does not see Roles or Users in the sidebar", async ({
    page,
  }) => {
    await loginAndWait(page, "viewer");
    await expect(page.getByRole("link", { name: "Pages" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Roles" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);
  });

  test("admin sees Roles and Users in the sidebar", async ({ page }) => {
    await loginAndWait(page, "admin");
    await expect(page.getByRole("link", { name: "Roles" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
  });

  test("editor can create a page through the real server action", async ({
    page,
  }) => {
    await loginAndWait(page, "editor");
    const slug = `e2e-editor-${Date.now()}`;

    await page.goto("/admin/pages/new");
    await page.getByLabel("Title").fill(`E2E ${slug}`);
    await page.getByLabel("Slug").fill(slug);
    await page.getByRole("button", { name: "Create" }).click();

    // Not just any /admin/pages/<x> - "new" is the form we started on.
    await expect(page).toHaveURL(/\/admin\/pages\/(?!new$)[^/]+$/);
    expect(await pageSlugsVisibleTo(page)).toContain(`/${slug}`);
  });

  test("server action rejects a viewer even when called directly", async ({
    browser,
  }) => {
    // Editor session: supplies the action id and a positive control.
    const editorContext = await browser.newContext();
    const editor = await editorContext.newPage();
    await loginAndWait(editor, "editor");
    const actionField = await createPageActionField(editor);

    const controlSlug = `e2e-control-${Date.now()}`;
    const control = await postCreatePage(editor, actionField, controlSlug);
    // Redirect to the new page's detail view = the action really ran.
    expect(control.status()).toBe(303);
    expect(await pageSlugsVisibleTo(editor)).toContain(`/${controlSlug}`);

    // Same request, viewer session.
    const viewerContext = await browser.newContext();
    const viewer = await viewerContext.newPage();
    await loginAndWait(viewer, "viewer");

    const blockedSlug = `e2e-blocked-${Date.now()}`;
    const blocked = await postCreatePage(viewer, actionField, blockedSlug);
    expect(blocked.status()).toBe(500);
    expect(await pageSlugsVisibleTo(editor)).not.toContain(`/${blockedSlug}`);

    await editorContext.close();
    await viewerContext.close();
  });
});
