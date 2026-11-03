import { expect, test, type Page } from "@playwright/test";
import { SEED_PASSWORD, randomTestIp, setFakeIp } from "./fixtures";

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

test.describe("rate limit: public API", () => {
  test("121st request in a minute from one IP gets a 429 envelope; another IP doesn't", async ({
    request,
  }) => {
    let ip = randomTestIp();
    const get = (fromIp: string) =>
      request.get("/api/v1/pages", { headers: { "x-forwarded-for": fromIp } });

    // Fixed 60s windows: if this one is about to end, start in the next one
    // so a reset can't land mid-test.
    let first = await get(ip);
    const resetsIn =
      Number(first.headers()["x-ratelimit-reset"]) * 1000 - Date.now();
    if (resetsIn < 15_000) {
      await new Promise((resolve) => setTimeout(resolve, resetsIn + 500));
      ip = randomTestIp();
      first = await get(ip);
    }

    expect(first.status()).toBe(200);
    expect(first.headers()["x-ratelimit-limit"]).toBe("120");
    expect(first.headers()["x-ratelimit-remaining"]).toBe("119");
    // Public API responses never touch the session cookie.
    expect(first.headers()["set-cookie"]).toBeUndefined();

    const rest = await Promise.all(Array.from({ length: 119 }, () => get(ip)));
    expect(rest.every((response) => response.status() === 200)).toBe(true);

    const limited = await get(ip);
    expect(limited.status()).toBe(429);
    expect(await limited.json()).toEqual({
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Try again later.",
      },
    });
    const retryAfter = Number(limited.headers()["retry-after"]);
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(60);
    expect(limited.headers()["x-ratelimit-remaining"]).toBe("0");

    expect((await get(randomTestIp())).status()).toBe(200);
  });
});
