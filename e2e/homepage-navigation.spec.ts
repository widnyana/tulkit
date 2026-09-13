import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const palette = (page: Page) => page.getByRole("dialog", { name: "Search tools" });
const query = (page: Page) =>
  page.getByRole("searchbox", { name: "Search tools" });

test.describe("tool navigation", () => {
  test("Ctrl+K opens the palette and Enter jumps to the first match", async ({
    page,
  }) => {
    await page.goto("/");
    await page.keyboard.press("Control+k");
    await expect(palette(page)).toBeVisible();
    await query(page).fill("cron");
    await expect(
      palette(page).getByRole("link", {
        name: "Cron Expression Generator",
        exact: true,
      }),
    ).toBeVisible();
    await expect(palette(page).getByRole("link")).toHaveCount(1);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/cron$/);
    await expect(palette(page)).toBeHidden();
  });

  test("the header trigger opens the palette and Escape closes it", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Search tools/ }).click();
    await expect(palette(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(palette(page)).toBeHidden();
  });

  test("the palette is global and jumps between tool pages", async ({ page }) => {
    await page.goto("/base64");
    await page.keyboard.press("Control+k");
    await query(page).fill("invoice");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/invoice$/);
  });

  test("/ opens the palette; Escape clears the query before closing", async ({
    page,
  }) => {
    await page.goto("/");
    await page.keyboard.press("/");
    await expect(palette(page)).toBeVisible();
    await query(page).fill("zzzz");
    await expect(palette(page).getByText("No tools match “zzzz”")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(query(page)).toHaveValue("");
    await expect(palette(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(palette(page)).toBeHidden();
  });

  test("arrow keys walk the palette results and highlight the match", async ({
    page,
  }) => {
    await page.goto("/");
    await page.keyboard.press("Control+k");
    await query(page).fill("ip");
    await page.keyboard.press("ArrowDown");
    await expect(
      palette(page).getByRole("link", { name: "NetPlan", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(
      palette(page).getByRole("link", { name: "IP Calculator", exact: true }),
    ).toBeFocused();
    // Highlighted only marks tool.title, not description/keywords. "NetPlan"'s
    // title has no literal "ip" (only its keywords do — "IP planning"); only
    // "IP Calculator"'s title matches. "ip" also substring-matches "multiple"
    // in Invoice Generator's description, so a third, unrelated result is
    // present too — it sorts last (Productivity after Network) and carries no
    // mark since its title doesn't contain "ip", so it doesn't affect the
    // arrow-focus assertions above.
    await expect(palette(page).getByRole("link")).toHaveCount(3);
    await expect(palette(page).locator("mark")).toHaveCount(1);
  });

  test("category chips scope the directory and report the count", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Network" }).click();
    await expect(
      page.getByRole("link", { name: "NetPlan", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "IP Calculator", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Cron Expression Generator", exact: true }),
    ).toHaveCount(0);
    await expect(page.locator("main [role=status]")).toHaveText(
      "2 tools in Network",
    );
  });

  test("recently used tools appear after visiting one", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Recently used" }),
    ).toHaveCount(0);
    await page
      .getByRole("link", { name: "Cron Expression Generator", exact: true })
      .click();
    await expect(page).toHaveURL(/\/cron$/);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Recently used" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Cron Expression Generator", exact: true }),
    ).toHaveCount(2);
  });
});
