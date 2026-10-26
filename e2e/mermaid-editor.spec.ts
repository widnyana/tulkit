import { expect, test } from "@playwright/test";

test.describe("Mermaid editor", () => {
  test("renders the diagram, reports syntax errors, and exports SVG", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err: Error) => pageErrors.push(err.message));

    await page.goto("/mermaid-editor");
    const preview = page.getByLabel("Diagram preview");

    // Sample loads on first visit and renders an SVG.
    await expect(preview.locator("svg")).toBeVisible({ timeout: 30_000 });

    await page.getByLabel("Mermaid Code").fill("graph TD\n  X[Alpha] --> Y[Beta]");
    await expect(preview.locator("svg")).toContainText("Alpha", { timeout: 15_000 });

    const downloads: string[] = [];
    page.on("download", (d) => downloads.push(d.suggestedFilename()));
    await page.getByRole("button", { name: "Download SVG" }).click();
    await expect.poll(() => downloads).toContain("diagram.svg");
    await page.getByRole("button", { name: "Download PNG" }).click();
    await expect.poll(() => downloads).toContain("diagram.png");

    // Invalid syntax surfaces an alert.
    await page.getByLabel("Mermaid Code").fill("graph TD\n  A --> ((((");
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 15_000 });

    expect(pageErrors).toEqual([]);
  });

  test("code persists across reloads", async ({ page }) => {
    await page.goto("/mermaid-editor");
    await page.getByLabel("Mermaid Code").fill("graph LR\n  P --> Q");
    await page.reload();
    await expect(page.getByLabel("Mermaid Code")).toHaveValue("graph LR\n  P --> Q");
  });
});
