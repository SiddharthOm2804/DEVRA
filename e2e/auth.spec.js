import { test, expect } from "@playwright/test";
import { setupDeterministicMockApi, TEST_USERS, authenticateSession } from "./fixtures/testFixtures.js";

test.describe("Authentication and RBAC E2E Workflows", () => {
  test.beforeEach(async ({ page }) => {
    await setupDeterministicMockApi(page, TEST_USERS.ARCHITECT);
  });

  test("Login page renders all essential branding and form controls", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    // Title & Headings
    await expect(page.getByRole("heading", { name: /Sign in to DEVRA/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Your AI Engineering Companion/i })).toBeVisible();

    // Inputs & Action Elements
    await expect(page.getByPlaceholder("developer@company.com")).toBeVisible();
    await expect(page.getByPlaceholder("Enter your password")).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign In to Devra/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Instant Demo Sign-In/i })).toBeVisible();
    await expect(page.getByText("Remember session on this device")).toBeVisible();
  });

  test("Invalid credentials display a safe, non-revealing error message", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    await page.getByPlaceholder("developer@company.com").fill("engineer@devra.ai");
    await page.getByPlaceholder("Enter your password").fill("InvalidPassword999!");
    await page.getByRole("button", { name: /Sign In to Devra/i }).click();

    // Verify error banner
    await expect(page.getByText(/Invalid email or password/i)).toBeVisible();
    // Verify user remains on login page
    expect(page.url()).toContain("/login");
  });

  test("Unauthenticated user accessing protected route is redirected to login", async ({ page }) => {
    // Clear any previous session
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.clear());

    // Attempt direct navigation to protected dashboard
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/login/);

    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("redirect=%2Fdashboard");
  });

  test("Instant Demo Sign-In authorizes user and loads Engineering Console", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Instant Demo Sign-In/i }).click();

    // Redirect to dashboard
    await page.waitForURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /Engineering Console/i })).toBeVisible();

    // Verify localStorage persistence
    const hasToken = await page.evaluate(() => !!localStorage.getItem("devra_token"));
    expect(hasToken).toBe(true);
  });

  test("Sign Out clears session tokens and redirects back to login page", async ({ page }) => {
    await authenticateSession(page, TEST_USERS.ARCHITECT, "/dashboard");

    // Open user profile dropdown in header
    const userButton = page.locator("header").locator("button").filter({ hasText: /Architect|Alex/i }).last();
    await userButton.click();

    // Click Sign Out button
    await page.getByRole("button", { name: /Sign Out/i }).click();

    // Expect redirection to login
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");

    // Verify tokens were cleared
    const token = await page.evaluate(() => localStorage.getItem("devra_token"));
    expect(token).toBeNull();

    // Verify protected route rejects access after logout
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });

  test("RBAC: Architect role allows access across console modules", async ({ page }) => {
    await authenticateSession(page, TEST_USERS.ARCHITECT, "/dashboard");

    // Verify navigation items exist and are accessible
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Repositories/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Code Reviews/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /AI Assistant/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Settings/i })).toBeVisible();
  });
});
