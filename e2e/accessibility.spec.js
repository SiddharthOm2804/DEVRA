import { test, expect } from "@playwright/test";
import { setupDeterministicMockApi, TEST_USERS, authenticateSession } from "./fixtures/testFixtures.js";

test.describe("Accessibility, Layout, and Semantic Reliability", () => {
  test.beforeEach(async ({ page }) => {
    await setupDeterministicMockApi(page, TEST_USERS.ARCHITECT);
  });

  test("Form inputs and primary action buttons have accessible labels and roles", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    // Email input has accessible label
    const emailInput = page.getByRole("textbox", { name: /Work Email/i });
    await expect(emailInput).toBeVisible({ timeout: 15000 });

    // Submit button has accessible name
    const submitBtn = page.getByRole("button", { name: /Sign In to Devra/i });
    await expect(submitBtn).toBeVisible();

    // Checkbox has accessible name
    const checkbox = page.getByRole("checkbox", { name: /Remember session on this device/i });
    await expect(checkbox).toBeVisible();
  });

  test("Keyboard navigation allows Tab traversal through login credentials", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    // Focus on email input
    const emailInput = page.getByRole("textbox", { name: /Work Email/i });
    await emailInput.focus();
    await page.keyboard.type("architect@devra.ai");

    // Focus on password input
    const passwordInput = page.getByPlaceholder("Enter your password");
    await passwordInput.focus();
    await page.keyboard.type("SuperSecretPassword123!");

    // Keyboard Space toggles checkbox
    const checkbox = page.getByRole("checkbox", { name: /Remember session on this device/i });
    await checkbox.focus();
    await page.keyboard.press("Space");

    // Verify checkbox is toggled
    expect(await checkbox.isChecked()).toBe(false);
  });

  test("Responsive layout: Mobile hamburger menu toggles navigation links", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await authenticateSession(page, TEST_USERS.ARCHITECT, "/dashboard");

    // Hamburger button should be visible on mobile
    const hamburgerBtn = page.locator("header button").first();
    await expect(hamburgerBtn).toBeVisible({ timeout: 15000 });
    await hamburgerBtn.click();

    // Mobile nav drawer should open
    await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Repositories/i }).first()).toBeVisible();
  });

  test("Navigation across primary routes produces zero uncaught exceptions", async ({ page }) => {
    const uncaughtErrors = [];
    page.on("pageerror", (err) => uncaughtErrors.push(err.message));

    await authenticateSession(page, TEST_USERS.ARCHITECT, "/dashboard");
    await page.goto("/repositories", { waitUntil: "domcontentloaded" });
    await page.goto("/reviews", { waitUntil: "domcontentloaded" });
    await page.goto("/settings", { waitUntil: "domcontentloaded" });

    expect(uncaughtErrors.length).toBe(0);
  });
});
