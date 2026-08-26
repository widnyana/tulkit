import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * Approximate luminance of a computed CSS color, 0 (black)..1 (white).
 * Handles "rgb(r, g, b)", "oklch(L C H)" (L 0..1) and "lab(L% a b)"
 * (L in percent) — Chromium serializes oklch-authored tokens as lab().
 * Achromatic tokens make the L channel a fair luminance proxy.
 */
async function luminance(page: Page, selector: string) {
  const rgb = await page.locator(selector).first().evaluate((el) => {
    const c = getComputedStyle(el).backgroundColor;
    const nums = (c.match(/[\d.]+/g) ?? []).map(Number);
    if (c.startsWith("lab")) return nums[0] / 100;
    if (c.startsWith("oklch")) return nums[0];
    if (c.startsWith("rgb") && nums.length >= 3)
      return 0.2126 * (nums[0] / 255) + 0.7152 * (nums[1] / 255) + 0.0722 * (nums[2] / 255);
    return 1;
  });
  return rgb;
}

async function textLuminance(page: Page, selector: string) {
  const l = await page.locator(selector).first().evaluate((el) => {
    const c = getComputedStyle(el).color;
    const nums = (c.match(/[\d.]+/g) ?? []).map(Number);
    if (c.startsWith("lab")) return nums[0] / 100;
    if (c.startsWith("oklch")) return nums[0];
    if (c.startsWith("rgb") && nums.length >= 3)
      return 0.2126 * (nums[0] / 255) + 0.7152 * (nums[1] / 255) + 0.0722 * (nums[2] / 255);
    return 1;
  });
  return l;
}

const TOOL_ROUTES = [
  "/cron",
  "/base64",
  "/env-compare",
  "/ipcalc",
  "/ip-planner",
  "/qr-gen",
  "/random-string",
  "/json-schema",
  "/invoice",
];

test.describe("theme toggle", () => {
  test("dark mode applies on the page it was toggled from and persists", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err: Error) => pageErrors.push(err.message));

    await page.goto("/");
    const html = page.locator("html");

    // Default is system; with light emulation the dark class must be absent.
    await page.emulateMedia({ colorScheme: "light" });
    await expect(html).not.toHaveClass(/dark/);

    // Pick Dark explicitly.
    await page.getByRole("button", { name: "Dark theme" }).click();
    await expect(html).toHaveClass(/dark/);

    // Persists across reload.
    await page.reload();
    await expect(html).toHaveClass(/dark/);

    // And applies to a different route (toggle is global, class is on <html>).
    await page.goto("/cron");
    await expect(page.locator('input[data-testid="cron-expression"]')).toBeVisible();
    await expect(html).toHaveClass(/dark/);
    // The page must actually render dark, not just carry the class.
    await expect
      .poll(async () => luminance(page, ".min-h-screen"))
      .toBeLessThan(0.3);
    await expect.poll(async () => textLuminance(page, "h1")).toBeGreaterThan(0.6);
    // Back to System restores OS preference (light here).
    await page
      .getByRole("button", { name: "System theme" })
      .click();
    await expect(html).not.toHaveClass(/dark/);
    await expect
      .poll(async () => luminance(page, ".min-h-screen"))
      .toBeGreaterThan(0.8);

    expect(pageErrors).toEqual([]);
  });

  test("system mode follows OS color-scheme changes", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");

    await page.emulateMedia({ colorScheme: "dark" });
    await expect(html).toHaveClass(/dark/);

    await page.emulateMedia({ colorScheme: "light" });
    await expect(html).not.toHaveClass(/dark/);
  });

  test("light choice overrides dark OS preference", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    const html = page.locator("html");

    // System default follows the dark OS setting.
    await expect(html).toHaveClass(/dark/);

    await page.getByRole("button", { name: "Light theme" }).click();
    await expect(html).not.toHaveClass(/dark/);
  });

  test("every tool page actually renders dark in dark mode", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err: Error) => pageErrors.push(err.message));

    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");

    for (const route of TOOL_ROUTES) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      // Page shell must be dark (token-driven, follows .dark on <html>).
      await expect
        .poll(async () => luminance(page, ".min-h-screen"))
        .toBeLessThan(0.3);
      // Headings must be light text on the dark shell.
      await expect.poll(async () => textLuminance(page, "h1")).toBeGreaterThan(0.6);
    }

    expect(pageErrors).toEqual([]);
  });
});
