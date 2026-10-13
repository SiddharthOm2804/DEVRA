import { test, expect } from "@playwright/test";
import { setupDeterministicMockApi, TEST_USERS, authenticateSession } from "./fixtures/testFixtures.js";

test.describe("AI Code Review and GitHub Webhook Visibility Workflows", () => {
  test.beforeEach(async ({ page }) => {
    await setupDeterministicMockApi(page, TEST_USERS.ARCHITECT);
    await authenticateSession(page, TEST_USERS.ARCHITECT, "/dashboard");

    // Navigate to Code Reviews via App navigation link
    const reviewsLink = page.getByRole("link", { name: /Code Reviews/i });
    await expect(reviewsLink).toBeVisible({ timeout: 15000 });
    await reviewsLink.click();
    await page.waitForURL(/\/reviews/);
  });

  test("Code Review page loads with review engine header and action buttons", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /AI Code Review Engine/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /New Code Review/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Refresh/i })).toBeVisible();
  });

  test("Review creator drawer opens and displays pre-packaged code templates", async ({ page }) => {
    await expect(page.getByRole("button", { name: /New Code Review/i })).toBeVisible({ timeout: 15000 });
    // Open review creator
    await page.getByRole("button", { name: /New Code Review/i }).click();

    // Verify preset templates
    await expect(page.getByText(/Configure & Run AI Review/i)).toBeVisible();
    await expect(page.getByText(/Auth with eval/i)).toBeVisible();
    await expect(page.getByText(/React Memory Leak/i)).toBeVisible();

    // Close review creator
    await page.getByRole("button", { name: /Close Review Creator/i }).click();
  });

  test("Webhook-generated review record renders with score and findings", async ({ page }) => {
    // Verify automated review card exists
    const reviewCard = page.getByText(/Automated Review for PR #42|PR #42/i).first();
    await expect(reviewCard).toBeVisible({ timeout: 15000 });

    // Verify findings callout
    await expect(page.getByText(/Zero critical security vulnerabilities|Function complexity/i).first()).toBeVisible();
  });
});
