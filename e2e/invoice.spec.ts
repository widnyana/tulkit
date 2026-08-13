import { expect, test, type ConsoleMessage } from "@playwright/test";

// Console text that must NEVER appear: the React uncontrolled->controlled
// warning we fixed, and the noisy save-error log we removed.
const BANNED = [/changing an uncontrolled input/i, /Invalid form data, not saving/i];

test.describe("invoice generator", () => {
  test("stays console-clean and produces a PDF download", async ({ page }) => {
    const offenses: string[] = [];
    const pageErrors: string[] = [];

    page.on("console", (msg: ConsoleMessage) => {
      const text = msg.text();
      if (BANNED.some((re) => re.test(text))) offenses.push(text);
    });
    page.on("pageerror", (err: Error) => pageErrors.push(err.message));

    await page.goto("/invoice");

    // Fill every required field so the preview mounts AND the form is valid.
    await page.getByPlaceholder("Your company name").fill("Test Co");
    await page.getByPlaceholder("Your address").fill("123 Sender St");
    await page.getByPlaceholder("your@email.com").fill("from@test.com");
    await page.getByPlaceholder("Your phone number").fill("+1 555 0001");
    await page.getByPlaceholder("Client name").fill("Test Client");
    await page.getByPlaceholder("Client address").fill("456 Client Ave");

    // PDF preview (PDFViewer) renders into an iframe with a blob src — proof
    // that @react-pdf/renderer compiled the invoice Document. First dev-compile
    // of react-pdf is slow, so allow generous time.
    await expect(page.locator('iframe[src^="blob:"]')).toBeVisible({ timeout: 30_000 });

    // Wait for the blob to be ready (button stops saying "Generating...").
    const trigger = page.getByText("Download Invoice PDF");
    await expect(trigger).toBeVisible({ timeout: 30_000 });

    const downloadPromise = page.waitForEvent("download", { timeout: 20_000 });
    await trigger.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^invoice-.*\.pdf$/i);

    // Hygiene checks: the two fixes hold and nothing threw at runtime.
    expect(offenses, `banned console output:\n${offenses.join("\n")}`).toEqual([]);
    expect(pageErrors, `uncaught page errors:\n${pageErrors.join("\n")}`).toEqual([]);
  });
});
