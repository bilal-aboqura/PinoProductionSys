import { expect, test } from "@playwright/test";
const appUrl = process.env.APP_URL;
test.skip(!appUrl, "Set APP_URL to run version history integration tests.");

test("published version renders frozen calculation values read-only", async ({ page }) => {
  await page.goto(`${appUrl}/en/recipes`);
  const history = page.locator('a[href$="/versions"]').first();
  test.skip((await history.count()) === 0, "Published recipe version required");
  await history.click();
  const version = page.locator('a[href*="/versions/"]').first();
  test.skip((await version.count()) === 0, "Published recipe version required");
  await version.click();
  await expect(page.getByText(/Read-Only/)).toBeVisible();
  await expect(page.getByText("Total cost:")).toBeVisible();
});
