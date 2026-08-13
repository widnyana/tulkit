import { defineConfig, devices } from "@playwright/test";

/**
 * UI tests run against the Next dev server (not a production build) so that
 * React dev-time checks fire — this is what lets the specs assert the
 * uncontrolled->controlled warning and removed console.error stay gone.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000/invoice",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
