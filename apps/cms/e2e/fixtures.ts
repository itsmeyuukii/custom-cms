import { expect, type Page } from "@playwright/test";

export type SeededUser = "admin" | "editor" | "viewer";

// Must match whatever the seed script hashed: SEED_USER_PASSWORD when set
// (CI sets it in the workflow), otherwise the seed's local fallback. `||`,
// not `??`, so an empty string counts as unset.
export const SEED_PASSWORD = process.env.SEED_USER_PASSWORD || "changeme123";

/** A random address in the IPv6 documentation range (2001:db8::/32). */
export function randomTestIp() {
  const group = () =>
    Math.floor(Math.random() * 0x10000)
      .toString(16)
      .padStart(4, "0");
  return `2001:db8:${group()}:${group()}::${group()}`;
}

/**
 * Sends every request from `page` as if from `ip`. Login is rate limited
 * per IP (docs/RATE_LIMIT_PLAN.md), and off Vercel the app trusts
 * x-forwarded-for, so this gives each login its own buckets instead of
 * the whole suite sharing localhost's.
 */
export async function setFakeIp(page: Page, ip = randomTestIp()) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": ip });
  return ip;
}

export async function login(page: Page, user: SeededUser, password?: string) {
  await setFakeIp(page);
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
