import { expect, test } from "@playwright/test";

const appUrl = process.env.APP_URL;

test.describe("thermal label printing", () => {
  test.skip(!appUrl, "Set APP_URL to run printing integration tests against a live app.");

  test("renders isolated thermal label pages without application chrome", async ({ page }) => {
    await page.goto(`${appUrl}/en/printing/label/test-job`);
    await expect(page.locator(".thermal-label")).toBeVisible();
    await expect(page.locator("header")).toHaveCount(0);
    const size = await page.locator(".thermal-label").first().getAttribute("data-size");
    expect(["50x50mm", "100x50mm", "100x100mm"]).toContain(size);
  });
});
