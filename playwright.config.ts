import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/integration",
  testMatch: ["**/*.test.ts", "**/*.spec.ts"],
  workers: process.env.APP_URL ? 4 : undefined,
  use: {
    storageState: process.env.PLAYWRIGHT_STORAGE_STATE || undefined
  }
});
