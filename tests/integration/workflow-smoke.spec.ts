import { expect, test, type Browser } from "@playwright/test";

const appUrl = process.env.APP_URL;
const password = process.env.E2E_PASSWORD;

async function authenticatedPage(browser: Browser, username: string, locale = "en") {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await page.goto(`${appUrl}/${locale}/login`);
  await page.locator("#identifier").fill(username);
  await page.locator("#password").fill(password!);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(new RegExp(`/${locale}/dashboard(?:\\?|$)`));
  return { context, page };
}

test.describe("cross-module workflow smoke", () => {
  test.skip(!appUrl || !password, "Set APP_URL and E2E_PASSWORD to run workflow smoke tests.");

  test("rejects invalid credentials without leaving login", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto(`${appUrl}/en/login`);
    await page.locator("#identifier").fill("e2e_admin");
    await page.locator("#password").fill("invalid-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/en\/login$/);
    await expect(page.getByText("Invalid username, email, or password.")).toBeVisible();
    await context.close();
  });

  test("supports Arabic authentication and locale routing", async ({ browser }) => {
    const { context, page } = await authenticatedPage(browser, "e2e_admin", "ar");
    await expect(page).toHaveURL(/\/ar\/dashboard(?:\?|$)/);
    await context.close();
  });

  test("administrator can render every major workflow page", async ({ page }) => {
    test.setTimeout(120_000);
    const routes = [
      "/en/dashboard",
      "/en/production",
      "/en/production/new",
      "/en/production/queue",
      "/en/inventory",
      "/en/inventory/items",
      "/en/inventory/warehouses",
      "/en/inventory/transfers",
      "/en/inventory/adjustments",
      "/en/inventory/history",
      "/en/inventory/batches",
      "/en/inventory/waste",
      "/en/recipes",
      "/en/recipes/new",
      "/en/recipes/categories",
      "/en/notifications",
      "/en/reports",
      "/en/reports/production",
      "/en/reports/inventory",
      "/en/reports/batches",
      "/en/reports/staff",
      "/en/reports/audit",
      "/en/printing",
      "/en/admin/users",
      "/en/admin/audit",
      "/en/admin/alert-rules",
      "/en/admin/printers",
      "/en/admin/settings"
    ];

    for (const route of routes) {
      const response = await page.goto(`${appUrl}${route}`);
      expect(response?.status(), route).toBeLessThan(500);
      await expect(page, route).not.toHaveURL(/\/login(?:\?|$)/);
      await expect(page.getByText("Something went wrong"), route).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Access Denied" }), route).toHaveCount(0);
    }
  });

  for (const scenario of [
    {
      username: "e2e_production",
      allowedLink: "Production",
      deniedLink: "Users",
      deniedRoutes: ["/en/admin/users", "/en/admin/audit", "/en/admin/settings", "/en/reports", "/en/inventory"]
    },
    {
      username: "e2e_warehouse",
      allowedLink: "Inventory",
      deniedLink: "Production",
      deniedRoutes: ["/en/admin/users", "/en/admin/audit", "/en/admin/settings", "/en/reports", "/en/production"]
    },
    {
      username: "e2e_supervisor",
      allowedLink: "Reports",
      deniedLink: "Users",
      deniedRoutes: ["/en/admin/users", "/en/admin/audit", "/en/admin/printers"]
    }
  ]) {
    test(`${scenario.username} receives scoped navigation and direct-route denial`, async ({ browser }) => {
      test.setTimeout(60_000);
      const { context, page } = await authenticatedPage(browser, scenario.username);
      const navigation = page.getByRole("navigation", { name: "Main navigation" });
      await expect(navigation.getByRole("link", { name: scenario.allowedLink, exact: true })).toBeVisible();
      await expect(navigation.getByRole("link", { name: scenario.deniedLink, exact: true })).toHaveCount(0);

      for (const route of scenario.deniedRoutes) {
        await page.goto(`${appUrl}${route}`);
        await expect(page.getByText("403", { exact: true }), route).toBeVisible();
        await expect(page.getByRole("heading", { name: "Access Denied" }), route).toBeVisible();
      }
      await context.close();
    });
  }
});
