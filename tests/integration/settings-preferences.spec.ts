import { expect, test } from "@playwright/test";

const appUrl = process.env.APP_URL;

test.describe("settings preferences", () => {
  test.skip(!appUrl, "Set APP_URL to run settings integration tests against a live app.");

  test("renders editable operational preference controls", async ({ page }) => {
    await page.goto(`${appUrl}/en/admin/settings`);
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.locator("input[name='lowStockThresholdPercent']")).toBeVisible();
    await expect(page.locator("select[name='defaultLanguage']")).toBeVisible();
    await expect(page.locator("select[name='currencyCode']")).toHaveValue("SAR");
  });
});
