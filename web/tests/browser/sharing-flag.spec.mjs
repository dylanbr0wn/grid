import { test, expect } from "@playwright/test";

test("sharing is hidden by default while image exports remain available", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("grid-albums-storage", JSON.stringify({ state: { hasSeenWelcome: true }, version: 0 }));
  });
  await page.goto("http://127.0.0.1:5177/");
  await expect(page.locator("#fm-grid")).toBeVisible();
  await expect(page.getByRole("button", { name: "Share", exact: true })).toHaveCount(0);
  for (const name of [".JPEG", ".PNG", ".WEBP", "Copy to Clipboard"]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  }
});
