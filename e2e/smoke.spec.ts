import { test, expect } from "@playwright/test";

/**
 * Smoke / happy-path E2E tests for ApplyFlow.
 *
 * Prerequisites:
 * - `npm run dev` running on http://localhost:5173
 * - Supabase project with migrations applied
 * - A test user already registered (or use the register flow)
 *
 * These tests are intentionally high-level so they remain stable
 * while the UI evolves. They document the core user journeys.
 */

const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";

test.describe("Public pages", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto(BASE + "/");
    await expect(page).toHaveTitle(/ApplyFlow|Apply/i);
  });

  test("login page is reachable", async ({ page }) => {
    await page.goto(BASE + "/login");
    await expect(page.getByRole("heading", { name: /sign in|log in|login/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test("register page is reachable", async ({ page }) => {
    await page.goto(BASE + "/register");
    await expect(page.getByRole("heading", { name: /sign up|register|create/i })).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe("Protected routes redirect when unauthenticated", () => {
  test("dashboard redirects to login", async ({ page }) => {
    await page.goto(BASE + "/dashboard");
    await page.waitForURL(/\/(login|)$/, { timeout: 10000 });
  });

  test("applications list redirects when not logged in", async ({ page }) => {
    await page.goto(BASE + "/applications");
    await page.waitForURL(/\/(login|)$/, { timeout: 10000 });
  });
});

/**
 * Authenticated flows – these require a real test account.
 * Set APPLYFLOW_TEST_EMAIL and APPLYFLOW_TEST_PASSWORD in the environment
 * to enable them.
 */
test.describe("Authenticated flows", () => {
  const email = process.env.APPLYFLOW_TEST_EMAIL;
  const password = process.env.APPLYFLOW_TEST_PASSWORD;

  test.skip(!email || !password, "Set APPLYFLOW_TEST_EMAIL and APPLYFLOW_TEST_PASSWORD to run");

  test("can log in and see dashboard", async ({ page }) => {
    await page.goto(BASE + "/login");
    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/password/i).fill(password!);
    await page.getByRole("button", { name: /sign in|log in/i }).click();

    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.getByText(/dashboard|applications|pipeline/i).first()).toBeVisible();
  });

  test("can navigate to applications list", async ({ page }) => {
    await page.goto(BASE + "/login");
    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/password/i).fill(password!);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    await page.goto(BASE + "/applications");
    await expect(page.getByRole("heading", { name: /applications/i })).toBeVisible({
      timeout: 10000,
    });
  });
});
