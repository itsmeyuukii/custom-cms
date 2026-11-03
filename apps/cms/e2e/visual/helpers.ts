import { expect, test, type Page } from "@playwright/test";

/**
 * Font rendering differs between Windows and Linux, so baselines are
 * Linux-only (CI's runner). Call at the top of every visual spec.
 */
export function skipUnlessLinux() {
  test.skip(
    process.platform !== "linux",
    "Visual baselines are Linux-only; see docs/E2E_TESTING_PLAN.md",
  );
}

/**
 * Parks the mouse on the sidebar's (non-interactive) title first, so a
 * hover style left over from the last click can't leak into the shot.
 */
export async function expectPageScreenshot(page: Page, name: string) {
  await page.mouse.move(0, 0);
  await expect(page).toHaveScreenshot(name, { fullPage: true });
}
