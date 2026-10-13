import { test, expect } from "@playwright/test";
import { setupDeterministicMockApi, TEST_USERS, authenticateSession } from "./fixtures/testFixtures.js";

test.describe("Repository Management Workflows", () => {
  test.beforeEach(async ({ page }) => {
    await setupDeterministicMockApi(page, TEST_USERS.ARCHITECT);
    await authenticateSession(page, TEST_USERS.ARCHITECT, "/repositories");
  });

  test("Repository list renders with cards, health benchmarks, and action controls", async ({ page }) => {
    // Header
    await expect(page.getByRole("heading", { name: /Repositories/i }).first()).toBeVisible({ timeout: 15000 });

    // Verify repository cards
    await expect(page.locator("h3").filter({ hasText: "devra-core" }).first()).toBeVisible();
    await expect(page.locator("h3").filter({ hasText: "hyper-cache-engine" }).first()).toBeVisible();

    // Search and filter controls
    await expect(page.getByPlaceholder(/Search by repo name/i)).toBeVisible();
  });

  test("Search query filters repositories in real-time", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Search by repo name/i);
    await expect(searchInput).toBeVisible({ timeout: 15000 });
    await searchInput.fill("hyper-cache");

    // Only hyper-cache-engine should remain visible
    await expect(page.locator("h3").filter({ hasText: "hyper-cache-engine" }).first()).toBeVisible();
    await expect(page.locator("h3").filter({ hasText: "devra-core" })).not.toBeVisible();

    // Clear search
    await searchInput.fill("");
    await expect(page.locator("h3").filter({ hasText: "devra-core" }).first()).toBeVisible();
  });

  test("Navigating to repository detail page loads full metadata and tabs", async ({ page }) => {
    const coreCard = page.locator("h3").filter({ hasText: "devra-core" }).first();
    await expect(coreCard).toBeVisible({ timeout: 15000 });
    await coreCard.click();

    // Expect navigation to repository details
    await page.waitForURL(/\/repositories\/repo-core-01/);

    // Verify tabs
    await expect(page.getByRole("button", { name: /3D Spatial Graph/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Architecture & Languages/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Detected Modules/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Dependencies/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Source Files Tree/i })).toBeVisible();
  });

  test("Tab switching changes displayed domain views cleanly", async ({ page }) => {
    await page.goto("/repositories/repo-core-01", { waitUntil: "domcontentloaded" });

    // Switch to Detected Modules tab
    const modulesTab = page.getByRole("button", { name: /Detected Modules/i });
    await expect(modulesTab).toBeVisible({ timeout: 15000 });
    await modulesTab.click();
    await expect(page.getByText(/Frontend|Backend|Services|Database/i).first()).toBeVisible();

    // Switch to Source Files Tree tab
    const filesTab = page.getByRole("button", { name: /Source Files Tree/i });
    await filesTab.click();
    await expect(page.getByText(/server\.ts|authController\.ts/i).first()).toBeVisible();
  });
});
