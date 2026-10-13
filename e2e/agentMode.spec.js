import { test, expect } from "@playwright/test";
import { setupDeterministicMockApi, TEST_USERS, authenticateSession } from "./fixtures/testFixtures.js";

test.describe("Agent Mode, RAG, and SSE Workflows", () => {
  test.beforeEach(async ({ page }) => {
    await setupDeterministicMockApi(page, TEST_USERS.ARCHITECT);
    await authenticateSession(page, TEST_USERS.ARCHITECT, "/repositories/repo-core-01");
  });

  test("Agent Mode tab loads with goal prompt input and suggested chips", async ({ page }) => {
    // Navigate to AI Agent Mode tab
    const agentTab = page.getByRole("button", { name: /AI Agent Mode/i }).first();
    await expect(agentTab).toBeVisible({ timeout: 15000 });
    await agentTab.click();

    // Verify prompt input
    const promptInput = page.getByPlaceholder(/Add forgot password/i);
    await expect(promptInput).toBeVisible({ timeout: 15000 });

    // Verify suggested goal chips exist
    await expect(page.getByRole("button", { name: /Implement rate limiting/i })).toBeVisible();
  });

  test("Clicking suggested goal chip populates prompt and initiates plan", async ({ page }) => {
    const agentTab = page.getByRole("button", { name: /AI Agent Mode/i }).first();
    await expect(agentTab).toBeVisible({ timeout: 15000 });
    await agentTab.click();

    const promptInput = page.getByPlaceholder(/Add forgot password/i);
    await expect(promptInput).toBeVisible({ timeout: 15000 });

    // Click suggested chip
    const chip = page.getByRole("button", { name: /Implement rate limiting/i });
    await chip.click();

    // Verify prompt populated and implementation plan synthesized
    await expect(promptInput).toHaveValue(/Implement rate limiting/i);
    await expect(page.getByText(/Synthesized Implementation Plan/i)).toBeVisible({ timeout: 15000 });
  });

  test("Submitting empty prompt is rejected gracefully with disabled button", async ({ page }) => {
    const agentTab = page.getByRole("button", { name: /AI Agent Mode/i }).first();
    await expect(agentTab).toBeVisible({ timeout: 15000 });
    await agentTab.click();

    const promptInput = page.getByPlaceholder(/Add forgot password/i);
    await promptInput.fill("");

    const startBtn = page.getByRole("button", { name: /Start Agent/i });
    await expect(startBtn).toBeDisabled();

    // Typing enables button
    await promptInput.fill("Refactor authentication pipeline");
    await expect(startBtn).toBeEnabled();
  });

  test("Active session displays execution plan and proposed diff preview", async ({ page }) => {
    const agentTab = page.getByRole("button", { name: /AI Agent Mode/i }).first();
    await expect(agentTab).toBeVisible({ timeout: 15000 });
    await agentTab.click();

    const promptInput = page.getByPlaceholder(/Add forgot password/i);
    await promptInput.fill("Implement rate limiting middleware");

    const startBtn = page.getByRole("button", { name: /Start Agent/i });
    await expect(startBtn).toBeEnabled();
    await startBtn.click();

    // Verify implementation plan step appears
    await expect(page.getByText(/Synthesized Implementation Plan/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Create token bucket rate limiter/i)).toBeVisible();

    // Verify proposed code diff preview
    await expect(page.getByText(/Proposed Code Changes & Diff Preview/i)).toBeVisible();
    await expect(page.getByText("server/src/middleware/rateLimiter.js").first()).toBeVisible();
  });
});
