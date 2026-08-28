import { expect, test, type ConsoleMessage } from "@playwright/test";
import fs from "node:fs";

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

  test("exports and re-imports the invoice JSON round-trip", async ({ page }) => {
    await page.goto("/invoice");
    // Fill every required field — the debounced save only fires when the
    // whole form passes schema validation.
    await page.getByPlaceholder("Your company name").fill("Roundtrip Co");
    await page.getByPlaceholder("Your address").fill("123 Sender St");
    await page.getByPlaceholder("your@email.com").fill("from@roundtrip.com");
    await page.getByPlaceholder("Your phone number").fill("+1 555 0001");
    await page.getByPlaceholder("Client name").fill("Test Client");
    await page.getByPlaceholder("Client address").fill("456 Client Ave");
    // Form state propagates to the page (and dump) on a 500ms debounce —
    // wait until the validated save lands in localStorage.
    await page.waitForFunction(
      () => localStorage.getItem("tulkit_invoice_data")?.includes("Roundtrip Co"),
      { timeout: 5000 },
    );

    // Headless Chromium reports the PDF-preview iframe blob as a download
    // event too — wait specifically for the JSON one.
    const downloadPromise = page.waitForEvent("download", {
      predicate: (d) => d.suggestedFilename().endsWith(".json"),
    });
    await page.getByRole("button", { name: "Export JSON" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^invoice-.*\.json$/);
    const jsonPath = await download.path();
    const dumped = JSON.parse(fs.readFileSync(jsonPath!, "utf8"));
    expect(dumped.sender.name).toBe("Roundtrip Co");

    // Wipe the field, then restore from the dump file.
    await page.getByPlaceholder("Your company name").fill("");
    await page.setInputFiles('input[type="file"]', jsonPath!);
    await expect(page.getByText("Invoice imported")).toBeVisible();
    await expect(page.getByPlaceholder("Your company name")).toHaveValue(
      "Roundtrip Co",
    );
  });

  test.describe("Load sample", () => {
    test("populates the form and renders the live preview", async ({ page }) => {
      await page.goto("/invoice");

      await page.getByRole("button", { name: "Load sample" }).click();

      // Placeholder is replaced by the live PDF preview (PDFViewer iframe).
      await expect(page.locator('iframe[src^="blob:"]')).toBeVisible({
        timeout: 30_000,
      });
    });

    test("preserves the selected template", async ({ page }) => {
      await page.goto("/invoice");
      const templateSelect = page.locator("select").first();
      await templateSelect.selectOption("granite");

      await page.getByRole("button", { name: "Load sample" }).click();

      await expect(templateSelect).toHaveValue("granite");
      await expect(page.locator('iframe[src^="blob:"]')).toBeVisible({
        timeout: 30_000,
      });
    });

    test("persists the sample across reload", async ({ page }) => {
      await page.goto("/invoice");
      await page.getByRole("button", { name: "Load sample" }).click();
      await expect(page.locator('iframe[src^="blob:"]')).toBeVisible({
        timeout: 30_000,
      });

      await page.reload();

      // After reload the sample is restored from localStorage.
      await expect(page.getByPlaceholder("Your company name")).toHaveValue(
        "Northwind Creative Studio",
      );
    });
  });
});
