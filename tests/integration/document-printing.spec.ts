import { expect, test } from "@playwright/test";

const appUrl = process.env.APP_URL;

test.describe("A4 document printing", () => {
  test.skip(!appUrl, "Set APP_URL to run document print tests against a live app.");

  test("production pages expose print summary controls and load print CSS", async ({ page }) => {
    await page.goto(`${appUrl}/en/production`);
    await expect(page.getByRole("button", { name: /print summary/i })).toBeVisible();
    const printRules = await page.evaluate(() =>
      Array.from(document.styleSheets).some((sheet) => {
        try {
          return Array.from(sheet.cssRules).some((rule) => rule.cssText.includes("@media print"));
        } catch {
          return false;
        }
      })
    );
    expect(printRules).toBe(true);
  });
});
