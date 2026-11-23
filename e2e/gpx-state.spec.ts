import { expect, test } from "@playwright/test";

const ACTIVE_TAB_KEY = "tulkit:gpx:active-tab:v1";
const INDEX_KEY = "tulkit:gpx:index";
const ENTRY_PREFIX = "tulkit:gpx:entry:";
const ENTRY_ID = "e2e-entry";
const WAYPOINT_NAME = "E2E Waypoint";

const SAMPLE_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="tulkit" xmlns="http://www.topografix.com/GPX/1/1">
  <wpt lat="-7.782" lon="110.369">
    <name>${WAYPOINT_NAME}</name>
  </wpt>
</gpx>`;

const ENTRY_KEY = `${ENTRY_PREFIX}${ENTRY_ID}`;
const ENTRY_VALUE = JSON.stringify({ rawText: SAMPLE_GPX, savedAt: 0 });
const INDEX_VALUE = JSON.stringify([ENTRY_ID]);

test.describe("GPX last state restore", () => {
  test("reopens the last active tab", async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => {
        window.localStorage.setItem(key, value);
      },
      [ACTIVE_TAB_KEY, "plan"] as const,
    );

    await page.goto("/gpx");

    await expect(page).toHaveURL(/tab=plan/, { timeout: 30_000 });
    await expect(page.getByRole("tab", { name: "Route" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("reopens the last saved GPX entry", async ({ page }) => {
    await page.addInitScript(
      ([activeKey, activeValue, indexKey, indexValue, entryKey, entryValue]) => {
        window.localStorage.setItem(activeKey, activeValue);
        window.localStorage.setItem(indexKey, indexValue);
        window.localStorage.setItem(entryKey, entryValue);
      },
      [
        ACTIVE_TAB_KEY,
        "view",
        INDEX_KEY,
        INDEX_VALUE,
        ENTRY_KEY,
        ENTRY_VALUE,
      ] as const,
    );

    await page.goto("/gpx");

    await expect(page).toHaveURL(/id=e2e-entry/, { timeout: 30_000 });
    await expect(page.locator("textarea").first()).toHaveValue(
      new RegExp(WAYPOINT_NAME),
    );
    await expect(page.getByText("Waypoints", { exact: true })).toBeVisible();
  });

  test("strips the view-only entry id from another tab", async ({ page }) => {
    await page.addInitScript(
      ([indexKey, indexValue, entryKey, entryValue]) => {
        window.localStorage.setItem(indexKey, indexValue);
        window.localStorage.setItem(entryKey, entryValue);
      },
      [INDEX_KEY, INDEX_VALUE, ENTRY_KEY, ENTRY_VALUE] as const,
    );

    await page.goto(`/gpx?tab=plan&id=${ENTRY_ID}`);

    await expect(page).toHaveURL(/\/gpx\?tab=plan$/, { timeout: 30_000 });
  });
});
