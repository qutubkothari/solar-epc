import { test, expect } from "@playwright/test";

test.describe("Smoke navigation", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 2, name: "Performance Workspace" })
    ).toBeVisible();
  });

  test("inquiries page loads", async ({ page }) => {
    await page.goto("/inquiries");
    await expect(
      page.getByRole("heading", { level: 2, name: "Inquiry Management" })
    ).toBeVisible();
  });

  test("items page loads", async ({ page }) => {
    await page.goto("/items");
    await expect(
      page.getByRole("heading", { level: 2, name: "Item Master" })
    ).toBeVisible();
  });

  test("settings page loads", async ({ page }) => {
    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { level: 2, name: "Settings" })
    ).toBeVisible();
  });

  test("execution page loads", async ({ page }) => {
    await page.goto("/execution");
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Execution & Serial Capture",
      })
    ).toBeVisible();
  });
});
