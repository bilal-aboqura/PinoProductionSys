import { expect, test } from "@playwright/test";

const appUrl = process.env.APP_URL;

test.describe("settings responsive layout", () => {
  test.skip(!appUrl, "Set APP_URL to run settings integration tests against a live app.");

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 }
  ]) {
    test(`settings page fits ${viewport.width}px viewport`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`${appUrl}/en/admin/settings`);
      await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
      const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      expect(horizontalOverflow).toBe(false);
    });
  }
});
