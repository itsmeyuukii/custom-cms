import { expect, test, type Page } from "@playwright/test";
import { SEED_PASSWORD, setFakeIp } from "./fixtures";

const INVALID = "Invalid email or password.";
const LIMITED = "Too many sign-in attempts. Try again in a few minutes.";

/** One sign-in attempt through the real form, waiting for its response. */
async function attempt(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes("/api/auth/callback/credentials"),
    ),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);
}

test.describe("rate limit: login", () => {
  test("sixth attempt for one account from one IP is blocked, even with the right password", async ({
    page,
  }) => {
    await setFakeIp(page);

    for (let i = 0; i < 5; i++) {
      await attempt(page, "viewer@example.com", "definitely-not-the-password");
      await expect(page.getByText(INVALID)).toBeVisible();
    }

    await attempt(page, "viewer@example.com", SEED_PASSWORD);
    await expect(page.getByText(LIMITED)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("the limit is per IP + email, not an account lockout", async ({
    page,
  }) => {
    await setFakeIp(page);
    for (let i = 0; i < 6; i++) {
      await attempt(page, "viewer@example.com", "definitely-not-the-password");
    }
    await expect(page.getByText(LIMITED)).toBeVisible();

    // Same account, different IP: still able to sign in.
    await setFakeIp(page);
    await attempt(page, "viewer@example.com", SEED_PASSWORD);
    await expect(page).toHaveURL(/\/admin$/);
  });
});
