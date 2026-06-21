import { expect, test } from "@playwright/test";
const appUrl = process.env.APP_URL;
test.skip(!appUrl, "Set APP_URL to run recipe report integration tests.");

test("recipe costing reports expose cost, calories, profitability, and trend views", async ({ page }) => {
  await page.goto(`${appUrl}/en/reports/recipes`);
  await expect(page.getByRole("heading", { name: "Recipe Costing & Nutrition" })).toBeVisible();
  await expect(page.getByRole("link", { name: "RECIPE PROFITABILITY" })).toBeVisible();
  await expect(page.getByRole("link", { name: "RECIPE COST TREND" })).toBeVisible();
});
