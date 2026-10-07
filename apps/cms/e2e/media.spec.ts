import { expect, test } from "@playwright/test";
import { loginAndWait } from "./fixtures";

// 1x1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

test.describe("media permissions", () => {
  test("viewer sees no upload form", async ({ page }) => {
    await loginAndWait(page, "viewer");
    await page.goto("/admin/media");
    await expect(page.getByRole("heading", { name: "Media" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Upload" })).toHaveCount(0);
  });

  test("editor sees the upload form but no Delete buttons", async ({
    page,
  }) => {
    await loginAndWait(page, "editor");
    await page.goto("/admin/media");
    await expect(page.getByRole("button", { name: "Upload" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
  });

  test("an unsupported file type is rejected before anything is stored", async ({
    page,
  }) => {
    await loginAndWait(page, "editor");
    await page.goto("/admin/media");

    const filename = `e2e-bad-${Date.now()}.txt`;
    // The input's `accept` is only a browser hint; setInputFiles bypasses it,
    // so this exercises the server-side type check.
    await page.getByLabel("File").setInputFiles({
      name: filename,
      mimeType: "text/plain",
      buffer: Buffer.from("not an image"),
    });
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      page.getByRole("button", { name: "Upload" }).click(),
    ]);
    expect(response.status()).toBe(500);

    await page.goto("/admin/media");
    await expect(page.getByText(filename)).toHaveCount(0);
  });
});

// Real upload/delete go to Vercel Blob, so they need a read/write token.
// CI has none (and shouldn't write to a real store), so this runs locally
// where .env provides one, and is skipped otherwise.
test.describe("media upload and delete", () => {
  test.skip(
    !process.env.BLOB_READ_WRITE_TOKEN,
    "needs BLOB_READ_WRITE_TOKEN (real Vercel Blob store)",
  );

  test("editor uploads, admin deletes, and the blob is really gone", async ({
    browser,
  }) => {
    const filename = `e2e-${Date.now()}.png`;

    const editorContext = await browser.newContext();
    const editor = await editorContext.newPage();
    await loginAndWait(editor, "editor");
    await editor.goto("/admin/media");
    await editor.getByLabel("File").setInputFiles({
      name: filename,
      mimeType: "image/png",
      buffer: PNG,
    });
    await editor.getByLabel("Alt text (optional)").fill("e2e pixel");
    await editor.getByRole("button", { name: "Upload" }).click();

    const item = editor.getByRole("listitem").filter({ hasText: filename });
    await expect(item).toBeVisible();
    const url = await item.getByRole("textbox").inputValue();
    expect((await editor.request.get(url)).status()).toBe(200);
    await editorContext.close();

    const adminContext = await browser.newContext();
    const admin = await adminContext.newPage();
    await loginAndWait(admin, "admin");
    await admin.goto("/admin/media");
    const adminItem = admin.getByRole("listitem").filter({ hasText: filename });
    await adminItem.getByRole("button", { name: "Delete" }).click();
    await expect(adminItem).toHaveCount(0);

    await expect
      .poll(async () => (await admin.request.get(url)).status())
      .toBe(404);
    await adminContext.close();
  });
});
