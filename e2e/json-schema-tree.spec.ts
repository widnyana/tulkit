import { test, expect } from "@playwright/test";

test.describe("json-schema tree", () => {
  test("renders the tree, honors expand/collapse all, and offers copy-path", async ({
    page,
  }) => {
    await page.goto("/json-schema");
    await page.getByRole("button", { name: /API Response/ }).click();
    await page.getByRole("button", { name: /Visualize Schema/i }).click();

    const tree = page.getByRole("heading", { name: "Schema Structure" });
    await expect(tree).toBeVisible();

    // Rows render with type badges and accessible toggles
    const toggles = page.getByRole("button", { name: "Expand", exact: true });
    await expect(toggles.first()).toBeVisible();

    // Expand all reveals more toggles-turned-collapses
    const before = await toggles.count();
    await page.getByRole("button", { name: /expand all/i }).click();
    const collapsed = page.getByRole("button", { name: "Collapse", exact: true });
    await expect(collapsed.first()).toBeVisible();
    expect(await collapsed.count()).toBeGreaterThanOrEqual(before);

    // Copy path affordance appears on hover over a row
    const copyButtons = page.getByRole("button", { name: "Copy path" });
    const firstRow = page.locator('[role="button"][tabindex="0"]').first();
    await firstRow.hover();
    await copyButtons.first().click();
    await expect(copyButtons.first()).toBeVisible();

    // Collapse all folds the tree back down
    await page.getByRole("button", { name: /collapse all/i }).click();
    await expect(
      page.getByRole("button", { name: "Expand", exact: true }).first(),
    ).toBeVisible();
  });
});
