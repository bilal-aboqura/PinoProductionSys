import { expect, test } from "@playwright/test";

const appUrl = process.env.APP_URL;

test.describe("protected printing access", () => {
  test.skip(!appUrl, "Set APP_URL to run protected printing tests against a live app.");
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const path of ["/en/dashboard", "/en/printing", "/en/printing/label/nonexistent-job"]) {
    test(`redirects an unauthenticated request for ${path} to login`, async ({ page }) => {
      await page.goto(`${appUrl}${path}`);

      await expect(page).toHaveURL(/\/en\/login(?:\?|$)/);
      await expect(page.locator(".thermal-label")).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Queue & History" })).toHaveCount(0);
    });
  }
});
