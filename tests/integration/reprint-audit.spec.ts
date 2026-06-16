import { expect, test } from "@playwright/test";

const appUrl = process.env.APP_URL;

test.describe("reprint audit and permissions", () => {
  test.skip(!appUrl, "Set APP_URL to run reprint audit tests against a live app.");

  test("print dashboard requires a reason before reprinting", async ({ page }) => {
    await page.goto(`${appUrl}/en/printing`);
    await expect(page.getByRole("heading", { name: "Queue & History" })).toBeVisible();
    const reprint = page.getByRole("button", { name: /reprint/i }).first();
    if (await reprint.isEnabled()) {
      await reprint.click();
      await expect(page.getByText("Reprint reason")).toBeVisible();
      await expect(page.getByLabel("Reason")).toBeVisible();
      await expect(page.getByLabel("Notes")).toBeVisible();
    }
  });
});
