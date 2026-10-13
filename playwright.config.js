import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Configuration for DEVRA
 * Supports local execution and CI environments.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 45000,
  expect: {
    timeout: 12000
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "playwright-report/test-results.json" }]
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15000,
    navigationTimeout: 30000
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        launchOptions: {
          args: [
            "--use-gl=angle",
            "--use-angle=swiftshader",
            "--enable-webgl",
            "--hide-scrollbars",
            "--mute-audio",
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-renderer-backgrounding"
          ]
        }
      }
    }
  ],
  webServer: [
    {
      command: "npm --prefix server start",
      url: "http://localhost:5000/api/health",
      reuseExistingServer: true,
      timeout: 35000,
      env: {
        PORT: "5000",
        NODE_ENV: "test",
        MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/devra",
        JWT_SECRET: "test_e2e_jwt_secret_devra_2026"
      }
    },
    {
      command: "npm --prefix client run dev -- --port 5173",
      url: "http://localhost:5173",
      reuseExistingServer: true,
      timeout: 35000
    }
  ]
});
