import { expect, test } from "@playwright/test";

const appUrl = process.env.APP_URL;

test.describe("printer configuration management", () => {
  test.skip(!appUrl, "Set APP_URL to run printer configuration tests against a live app.");

  test("admin printer page exposes CRUD controls", async ({ page }) => {
    await page.goto(`${appUrl}/en/admin/printers`);
    await expect(page.getByRole("heading", { name: "Printers" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /add printer|edit printer/i })).toBeVisible();
    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
  });
});
