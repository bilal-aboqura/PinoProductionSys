import { expect, test } from "@playwright/test";
const appUrl = process.env.APP_URL;
test.skip(!appUrl, "Set APP_URL to run permission integration tests.");

test("recipe costing report remains protected", async ({ browser }) => {
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await page.goto(`${appUrl}/en/reports/recipes`);
  await expect(page).toHaveURL(/\/login|\/reports\/recipes/);
  if (!page.url().includes("/login")) await expect(page.getByText(/Access Denied|permission/i)).toBeVisible();
  await context.close();
});
