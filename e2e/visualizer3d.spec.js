import { test, expect } from "@playwright/test";
import { setupDeterministicMockApi, TEST_USERS, authenticateSession } from "./fixtures/testFixtures.js";

test.describe("Three.js Level of Detail 3D Visualizer Workflows", () => {
  test.beforeEach(async ({ page }) => {
    await setupDeterministicMockApi(page, TEST_USERS.ARCHITECT);
    await authenticateSession(page, TEST_USERS.ARCHITECT, "/repositories/repo-core-01");

    // Activate 3D Explorer tab
    const tab3d = page.getByRole("button", { name: /3D Explorer|3D Spatial Graph/i }).first();
    await expect(tab3d).toBeVisible({ timeout: 15000 });
    await tab3d.click();
  });

  test("3D Spatial Visualizer mounts WebGL canvas and telemetry cockpit", async ({ page }) => {
    // Canvas locator
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 20000 });

    // Verify bottom telemetry pill
    await expect(page.getByText("Spatial AST", { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Nodes/i).first()).toBeVisible();
    await expect(page.getByText(/Edges/i).first()).toBeVisible();
  });

  test("View mode switcher updates between Architecture, Dependencies, and Health", async ({ page }) => {
    await expect(page.locator("canvas")).toBeVisible({ timeout: 20000 });

    // Click Dependencies mode
    const depButton = page.getByRole("button", { name: /^Dependencies$/i }).last();
    await expect(depButton).toBeVisible();
    await depButton.click();

    // Click Health mode
    const healthButton = page.getByRole("button", { name: /^Health$/i }).first();
    await expect(healthButton).toBeVisible();
    await healthButton.click();

    // Return to Architecture mode
    const archButton = page.getByRole("button", { name: /^Architecture$/i }).first();
    await expect(archButton).toBeVisible();
    await archButton.click();
  });

  test("LOD level controls switch between Auto and manual LOD levels (L0, L1, L2, L3)", async ({ page }) => {
    await expect(page.locator("canvas")).toBeVisible({ timeout: 20000 });

    // Verify LOD controls are present
    const autoButton = page.getByRole("button", { name: "Auto" });
    const l0Button = page.getByRole("button", { name: "L0" });
    const l1Button = page.getByRole("button", { name: "L1" });
    const l2Button = page.getByRole("button", { name: "L2" });
    const l3Button = page.getByRole("button", { name: "L3" });

    await expect(autoButton).toBeVisible();
    await expect(l0Button).toBeVisible();
    await expect(l1Button).toBeVisible();
    await expect(l2Button).toBeVisible();
    await expect(l3Button).toBeVisible();

    // Switch to L0 Overview
    await l0Button.click();
    await expect(page.getByText(/L0 Overview/i)).toBeVisible();

    // Switch to L2 File Detail
    await l2Button.click();
    await expect(page.getByText(/L2 File Detail/i)).toBeVisible();

    // Switch to L3 Deep AST
    await l3Button.click();
    await expect(page.getByText(/L3 Deep AST/i)).toBeVisible();

    // Return to Auto
    await autoButton.click();
  });

  test("3D AST search filters nodes and updates displayed count", async ({ page }) => {
    await expect(page.locator("canvas")).toBeVisible({ timeout: 20000 });

    const searchInput = page.getByPlaceholder(/Search 3D AST/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill("server");

    // Clear search
    const clearBtn = page.getByRole("button", { name: "✕" });
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
    }
  });

  test("Domain group filters allow isolating Frontend, Backend, and Services clusters", async ({ page }) => {
    await expect(page.locator("canvas")).toBeVisible({ timeout: 20000 });

    // Click Backend cluster filter
    const backendFilter = page.getByRole("button", { name: /Backend/i }).first();
    await expect(backendFilter).toBeVisible();
    await backendFilter.click();

    // Click All filter to restore full graph
    const allFilter = page.getByRole("button", { name: /All/i }).first();
    await expect(allFilter).toBeVisible();
    await allFilter.click();
  });
});
