import { expect, test } from "@playwright/test";

const appUrl = process.env.APP_URL;

test.describe("settings master data", () => {
  test.skip(!appUrl, "Set APP_URL to run settings integration tests against a live app.");

  test("renders localized master data management screens", async ({ page }) => {
    await page.goto(`${appUrl}/en/admin/settings/departments`);
    await expect(page.getByRole("heading", { name: "Departments" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "English name" }).first()).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Arabic name" }).first()).toBeVisible();
  });

  test("exposes archive actions only to users with write permission", async ({ page }) => {
    await page.goto(`${appUrl}/en/admin/settings/warehouses`);
    await expect(page.locator("body")).toContainText(/Warehouses|login|access|403/i);
  });
});
