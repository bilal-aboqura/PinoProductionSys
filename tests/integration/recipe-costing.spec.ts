import { expect, test } from "@playwright/test";
const appUrl = process.env.APP_URL;
test.skip(!appUrl, "Set APP_URL to run recipe costing integration tests.");

test("recipe editor exposes yield, serving, and calculation summaries", async ({ page }) => {
  await page.goto(`${appUrl}/en/recipes`);
  const firstRecipe = page.locator('a[href*="/recipes/"]').first();
  test.skip((await firstRecipe.count()) === 0, "Seeded recipe required");
  await firstRecipe.click();
  await expect(page.getByText("Yield Quantity")).toBeVisible();
  await expect(page.getByText("Serving Quantity")).toBeVisible();
  await expect(page.getByLabel("Recipe calculation summary")).toBeVisible();
});
