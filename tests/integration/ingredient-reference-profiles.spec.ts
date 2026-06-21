import { expect, test } from "@playwright/test";
const appUrl = process.env.APP_URL;
test.skip(!appUrl, "Set APP_URL to run reference profile integration tests.");

test("inventory managers can open effective reference profile inputs", async ({ page }) => {
  await page.goto(`${appUrl}/en/inventory/items`);
  const edit = page.getByRole("button", { name: /^Edit / }).first();
  test.skip((await edit.count()) === 0, "Inventory management permission and seed item required");
  await edit.click();
  await expect(page.getByText("New effective cost & calorie reference")).toBeVisible();
  await expect(page.getByPlaceholder("Cost ref quantity")).toHaveAttribute("min", "0.001");
});
