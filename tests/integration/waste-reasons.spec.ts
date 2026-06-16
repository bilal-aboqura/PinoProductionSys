import { expect, test } from "@playwright/test";

const appUrl = process.env.APP_URL;

test.describe("waste reasons settings", () => {
  test.skip(!appUrl, "Set APP_URL to run settings integration tests against a live app.");

  test("shows waste reason administration and inventory waste reason choices", async ({ page }) => {
    await page.goto(`${appUrl}/en/admin/settings/waste-reasons`);
    await expect(page.getByRole("heading", { name: "Waste Reasons" })).toBeVisible();

    await page.goto(`${appUrl}/en/inventory/waste`);
    await expect(page.locator("select[name='reason']")).toBeVisible();
  });
});
