import { expect, type Page } from "@playwright/test";

export type SeededUser = "admin" | "editor" | "viewer";

// Must match whatever the seed script hashed: SEED_USER_PASSWORD when set
// (CI sets it in the workflow), otherwise the seed's local fallback. `||`,
// not `??`, so an empty string counts as unset.
export const SEED_PASSWORD = process.env.SEED_USER_PASSWORD || "changeme123";

export async function login(page: Page, user: SeededUser, password?: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`${user}@example.com`);
  await page.getByLabel("Password").fill(password ?? SEED_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function loginAndWait(page: Page, user: SeededUser) {
  await login(page, user);
  await expect(page).toHaveURL(/\/admin$/);
}

export async function logout(page: Page) {
  await page
    .getByRole("button")
    .filter({ hasText: /^[A-Z?]{1,2}$/ })
    .click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
}
