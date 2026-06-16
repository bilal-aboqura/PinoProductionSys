import { expect, test } from "@playwright/test";

const appUrl = process.env.APP_URL;

test.describe("settings audit log", () => {
  test.skip(!appUrl, "Set APP_URL to run settings integration tests against a live app.");

  test("renders immutable configuration audit rows", async ({ page }) => {
    await page.goto(`${appUrl}/en/admin/settings/audit`);
    await expect(page.getByRole("heading", { name: "Configuration Audit" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/Delete|Edit/);
  });
});
