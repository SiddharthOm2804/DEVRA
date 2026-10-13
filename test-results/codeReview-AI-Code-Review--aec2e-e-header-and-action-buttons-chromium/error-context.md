# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: codeReview.spec.js >> AI Code Review and GitHub Webhook Visibility Workflows >> Code Review page loads with review engine header and action buttons
- Location: e2e\codeReview.spec.js:16:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /Refresh/i })
Expected: visible
Timeout: 12000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('button', { name: /Refresh/i }) with timeout 12000ms
  - waiting for getByRole('button', { name: /Refresh/i })

```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { setupDeterministicMockApi, TEST_USERS, authenticateSession } from "./fixtures/testFixtures.js";
  3  | 
  4  | test.describe("AI Code Review and GitHub Webhook Visibility Workflows", () => {
  5  |   test.beforeEach(async ({ page }) => {
  6  |     await setupDeterministicMockApi(page, TEST_USERS.ARCHITECT);
  7  |     await authenticateSession(page, TEST_USERS.ARCHITECT, "/dashboard");
  8  | 
  9  |     // Navigate to Code Reviews via App navigation link
  10 |     const reviewsLink = page.getByRole("link", { name: /Code Reviews/i });
  11 |     await expect(reviewsLink).toBeVisible({ timeout: 15000 });
  12 |     await reviewsLink.click();
  13 |     await page.waitForURL(/\/reviews/);
  14 |   });
  15 | 
  16 |   test("Code Review page loads with review engine header and action buttons", async ({ page }) => {
  17 |     await expect(page.getByRole("heading", { name: /AI Code Review Engine/i })).toBeVisible({ timeout: 15000 });
  18 |     await expect(page.getByRole("button", { name: /New Code Review/i })).toBeVisible();
> 19 |     await expect(page.getByRole("button", { name: /Refresh/i })).toBeVisible();
     |                                                                  ^ Error: expect(locator).toBeVisible() failed
  20 |   });
  21 | 
  22 |   test("Review creator drawer opens and displays pre-packaged code templates", async ({ page }) => {
  23 |     await expect(page.getByRole("button", { name: /New Code Review/i })).toBeVisible({ timeout: 15000 });
  24 |     // Open review creator
  25 |     await page.getByRole("button", { name: /New Code Review/i }).click();
  26 | 
  27 |     // Verify preset templates
  28 |     await expect(page.getByText(/Configure & Run AI Review/i)).toBeVisible();
  29 |     await expect(page.getByText(/Auth with eval/i)).toBeVisible();
  30 |     await expect(page.getByText(/React Memory Leak/i)).toBeVisible();
  31 | 
  32 |     // Close review creator
  33 |     await page.getByRole("button", { name: /Close Review Creator/i }).click();
  34 |   });
  35 | 
  36 |   test("Webhook-generated review record renders with score and findings", async ({ page }) => {
  37 |     // Verify automated review card exists
  38 |     const reviewCard = page.getByText(/Automated Review for PR #42|PR #42/i).first();
  39 |     await expect(reviewCard).toBeVisible({ timeout: 15000 });
  40 | 
  41 |     // Verify findings callout
  42 |     await expect(page.getByText(/Zero critical security vulnerabilities|Function complexity/i).first()).toBeVisible();
  43 |   });
  44 | });
  45 | 
```