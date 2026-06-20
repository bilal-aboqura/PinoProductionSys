import { expect, test } from "@playwright/test";

const appUrl = process.env.APP_URL;

test.describe("keyboard-emulation scanner integration", () => {
  test.skip(!appUrl, "Set APP_URL to run scanner integration tests against a live app.");

  test("fast Enter-terminated scan redirects to inventory search", async ({ page }) => {
    await page.goto(`${appUrl}/en/inventory`);
    await expect(page.getByRole("heading", { name: "Stock Levels" })).toBeVisible();
    await expect(page.locator('[data-scanner-ready="true"]')).toBeVisible();
    await page.evaluate(() => {
      for (const key of "ITEM-001") window.dispatchEvent(new KeyboardEvent("keydown", { key }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    });
    await expect(page).toHaveURL(/search=ITEM-001/, { timeout: 20_000 });
  });
});
