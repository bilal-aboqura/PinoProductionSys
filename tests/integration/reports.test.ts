import { expect, test } from "@playwright/test";

const appUrl = process.env.APP_URL;

test.describe("reports analytics", () => {
  test.skip(!appUrl, "Set APP_URL to run reports integration tests against a live app.");

  test("renders report filters and export links", async ({ page }) => {
    await page.goto(`${appUrl}/en/reports/production`);
    await expect(page.getByRole("heading", { name: "Production Reports" })).toBeVisible();
    await page.getByRole("combobox", { name: "Select a matching record" }).fill("order");
    await page.getByRole("button", { name: "Apply Filters" }).click();
    await expect(page.getByRole("link", { name: "Excel" })).toHaveAttribute("href", /format=excel/);
    await expect(page.getByRole("link", { name: "PDF" })).toHaveAttribute("href", /format=pdf/);
  });

  test.describe("unauthenticated access", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("protects reports when unauthenticated", async ({ page }) => {
      await page.goto(`${appUrl}/en/reports/staff`);
      await expect(page).toHaveURL(/\/en\/login(?:\?|$)/);
    });
  });
});
