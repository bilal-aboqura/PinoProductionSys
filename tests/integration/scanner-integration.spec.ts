import { expect, test } from "@playwright/test";

const appUrl = process.env.APP_URL;

test.describe("keyboard-emulation scanner integration", () => {
  test.skip(!appUrl, "Set APP_URL to run scanner integration tests against a live app.");

  test("fast Enter-terminated scan redirects to inventory search", async ({ page }) => {
    await page.goto(`${appUrl}/en/inventory`);
    await page.keyboard.type("ITEM-001", { delay: 5 });
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/search=ITEM-001/);
  });
});
