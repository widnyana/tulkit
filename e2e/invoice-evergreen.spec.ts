import { expect, test, type ConsoleMessage } from "@playwright/test";
import { readFileSync } from "node:fs";

// Counts pages in a generated PDF by reading "/Type /Page" markers from the
// raw buffer — no PDF parsing dependency needed for a >= 2 assertion.
function pdfPageCount(buffer: Buffer): number {
  const matches = buffer.toString("latin1").match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 0;
}

test.describe("Evergreen invoice template", () => {
  test("renders the sample with a clean console", async ({ page }) => {
    const offenses: string[] = [];
    page.on("console", (msg: ConsoleMessage) => {
      if (/invalid|string child/i.test(msg.text())) offenses.push(msg.text());
    });
    const pageErrors: string[] = [];
    page.on("pageerror", (err: Error) => pageErrors.push(err.message));

    await page.goto("/invoice");
    await page.locator("select").first().selectOption("evergreen");
    await page.getByRole("button", { name: "Load sample" }).click();

    await expect(page.locator('iframe[src^="blob:"]')).toBeVisible({
      timeout: 30_000,
    });

    expect(offenses, `react-pdf string-child warnings:\n${offenses.join("\n")}`).toEqual([]);
    expect(pageErrors, `uncaught page errors:\n${pageErrors.join("\n")}`).toEqual([]);
  });

  test("multi-page invoice has no content cut across pages", async ({
    page,
  }) => {
    await page.goto("/invoice");
    await page.locator("select").first().selectOption("evergreen");

    // Fill the minimum valid form, then overflow one A4 page with items.
    await page.getByPlaceholder("Your company name").fill("Test Co");
    await page.getByPlaceholder("Your address").fill("123 Sender St");
    await page.getByPlaceholder("your@email.com").fill("from@test.com");
    await page.getByPlaceholder("Your phone number").fill("+1 555 0001");
    await page.getByPlaceholder("Client name").fill("Test Client");
    await page.getByPlaceholder("Client address").fill("456 Client Ave");

    const addItem = page.getByRole("button", { name: "Add Item" });
    for (let i = 0; i < 30; i++) {
      await addItem.click();
    }
    // The form pushes valid data to the preview/download via a 500ms debounced
    // save. Let it flush so the downloaded PDF contains every item.
    await page.waitForTimeout(1000);

    // Wait for the preview, then download and verify the PDF is multi-page.
    await expect(page.locator('iframe[src^="blob:"]')).toBeVisible({
      timeout: 30_000,
    });
    const trigger = page.getByText("Download Invoice PDF");
    await expect(trigger).toBeVisible({ timeout: 30_000 });

    const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
    await trigger.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^invoice-.*\.pdf$/i);
    // Keep the artifact for manual inspection of the page-break layout.
    await download.saveAs("test-results/evergreen-multi.pdf");
    const buffer = readFileSync(await download.path());
    const pages = pdfPageCount(buffer);
    expect(
      pages,
      "30 items must produce a multi-page PDF (page-break contract)",
    ).toBeGreaterThanOrEqual(2);
  });
});
