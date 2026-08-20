import { defineConfig } from "@playwright/test";

const productionUrl = "http://127.0.0.1:4173/algos-mini-games/";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: productionUrl,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { browserName: "chromium", viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "mobile-320",
      use: { browserName: "chromium", viewport: { width: 320, height: 800 } },
    },
  ],
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173",
    url: productionUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
