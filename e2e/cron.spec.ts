import { test, expect } from "@playwright/test";

const INPUT = 'input[data-testid="cron-expression"]';

test.describe("cron editor", () => {
  test("shows description and next-run lines for the default expression", async ({
    page,
  }) => {
    await page.goto("/cron");
    await expect(page.locator(INPUT)).toHaveValue("* * * * *");
    await expect(page.getByTestId("cron-description")).toHaveText(
      "Every minute.",
    );
    await expect(page.getByTestId("cron-next-runs")).toContainText(
      /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/,
    );
  });

  test("example chips update the expression and description", async ({
    page,
  }) => {
    await page.goto("/cron");

    await page
      .locator('[data-testid="cron-example"]', { hasText: "Hourly" })
      .click();
    await expect(page.locator(INPUT)).toHaveValue("0 * * * *");

    await page
      .locator('[data-testid="cron-example"]', { hasText: "Daily at 03:00" })
      .click();
    await expect(page.locator(INPUT)).toHaveValue("0 3 * * *");
    await expect(page.getByTestId("cron-description")).toContainText("03:00");
  });

  test("cadence cards and field grid rewrite the schedule", async ({
    page,
  }) => {
    await page.goto("/cron");
    const box = page.locator(INPUT);

    // A cadence card sets the whole expression.
    await page
      .locator('[data-testid="cron-example"]', { hasText: "Every 5 minutes" })
      .click();
    await expect(box).toHaveValue("*/5 * * * *");

    // Editing a field cell rewrites that token in the expression.
    await page.getByTestId("cron-field-minute").fill("15");
    await expect(box).toHaveValue("15 * * * *");

    await page.getByTestId("cron-field-dow").fill("1-5");
    await expect(box).toHaveValue("15 * * * 1-5");

    // The expression survives focus moving elsewhere (no panel to close).
    await page.locator(INPUT).click();
    await expect(box).toHaveValue("15 * * * 1-5");
  });

  test("field grid reflects the typed expression and validates", async ({
    page,
  }) => {
    await page.goto("/cron");
    const box = page.locator(INPUT);

    // Typing in the expression mirrors into the field grid.
    await box.fill("0 9 * * 1-5");
    await expect(page.getByTestId("cron-field-hour")).toHaveValue("9");
    await expect(page.getByTestId("cron-field-dow")).toHaveValue("1-5");

    // Invalid tokens flag the offending cell inline.
    await box.fill("0 99 * * *");
    await expect(page.getByTestId("cron-field-hour")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(
      page.getByTestId("cron-field-hour").locator("..").getByText(/Invalid hour/),
    ).toBeVisible();
  });

  test("presets, shortcuts, and deploy controls stay clickable back-to-back", async ({
    page,
  }) => {
    await page.goto("/cron");
    const box = page.locator(INPUT);

    // Rapid-fire preset clicks must not hang the page.
    await page
      .locator('[data-testid="cron-example"]', { hasText: "Every 5 minutes" })
      .click();
    await expect(box).toHaveValue("*/5 * * * *");
    await page
      .locator('[data-testid="cron-example"]', { hasText: "Yearly" })
      .click();
    await expect(box).toHaveValue("0 0 1 1 *");

    // Shortcut chip in the syntax reference.
    await page.getByTestId("cron-shortcut").filter({ hasText: "@reboot" }).click();
    await expect(box).toHaveValue("@reboot");

    // Deploy panel is always visible — switch target to /etc/cron.d.
    const commandInput = page.getByTestId("cron-command");
    await commandInput.fill("/usr/bin/rsync -a");
    await page.getByTestId("cron-target").selectOption("cron-d");

    const fileNameInput = page.getByTestId("cron-file-name");
    await fileNameInput.fill("bad.name");
    await expect(page.getByText(/must contain only letters/)).toBeVisible();

    // Fixing the file name clears the error and shows the full entry.
    await fileNameInput.fill("nightly-rsync");
    await page.getByTestId("cron-user").fill("deploy");
    await expect(page.getByTestId("cron-output")).toContainText(
      "@reboot deploy /usr/bin/rsync -a",
    );
    await page.getByTestId("cron-copy-line").click(); // must not hang or crash
  });
});
