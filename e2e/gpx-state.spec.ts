import { expect, test } from "@playwright/test";

const ACTIVE_TAB_KEY = "tulkit:gpx:active-tab:v1";
const INDEX_KEY = "tulkit:gpx:index";
const ENTRY_PREFIX = "tulkit:gpx:entry:";
const MAPS_INPUT_KEY = "tulkit:gpx:maps-input:v1";
const MAPS_RESULT_KEY = "tulkit:gpx:maps-result:v1";
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

const MAPS_URL = "https://maps.google.com/place/Test+Landmark/@-7.782,110.369,17z";
const MAPS_RESULT = {
  url: MAPS_URL,
  waypoints: [
    { lat: -7.782, lon: 110.369, name: "Start" },
    { lat: -7.783, lon: 110.372, name: "Finish" },
  ],
  route: [
    { lat: -7.782, lon: 110.369 },
    { lat: -7.783, lon: 110.372 },
  ],
  savedAt: 0,
};
const MAPS_RESULT_VALUE = JSON.stringify(MAPS_RESULT);

test.describe("GPX link opened on another browser", () => {
  const MISSING_ID = "6acee03b-6a72-4dd6-81a2-248531decc76";

  test("explains that a foreign id lives only in its own browser", async ({
    page,
  }) => {
    await page.goto(`/gpx?id=${MISSING_ID}`);

    const notice = page.getByRole("region", { name: "Saved GPX not found" });
    await expect(notice).toBeVisible({ timeout: 30_000 });
    await expect(notice).toContainText(MISSING_ID);
    await expect(notice).toContainText("send the .gpx file");
    await expect(notice).toContainText("browser that created them");
    await expect(
      page.getByRole("region", { name: "File metadata" }),
    ).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`id=${MISSING_ID}`));
  });

  test("dismissing the notice drops the dead id from the url", async ({
    page,
  }) => {
    await page.goto(`/gpx?id=${MISSING_ID}`);

    const notice = page.getByRole("region", { name: "Saved GPX not found" });
    await expect(notice).toBeVisible({ timeout: 30_000 });
    await notice.getByRole("button", { name: "Dismiss" }).click();

    await expect(page).toHaveURL(/\/gpx$/, { timeout: 15_000 });
    await expect(notice).toHaveCount(0);
    await expect(
      page.getByText("Paste GPX XML above or upload a .gpx file"),
    ).toBeVisible();
  });

  test("pasting a file replaces the foreign id with a local entry", async ({
    page,
  }) => {
    await page.goto(`/gpx?id=${MISSING_ID}`);
    const notice = page.getByRole("region", { name: "Saved GPX not found" });
    await expect(notice).toBeVisible({ timeout: 30_000 });

    await page.locator("textarea").first().fill(SAMPLE_GPX);

    await expect(notice).toHaveCount(0);
    await expect(page.getByText("Waypoints", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  });
});

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

  test("restores the cached Maps import without a network call", async ({
    page,
  }) => {
    const resolveRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/resolve-maps-link")) {
        resolveRequests.push(request.url());
      }
    });

    await page.addInitScript(
      ([activeKey, inputKey, inputValue, resultKey, resultValue]) => {
        window.localStorage.setItem(activeKey, "maps");
        window.localStorage.setItem(inputKey, inputValue);
        window.localStorage.setItem(resultKey, resultValue);
      },
      [
        ACTIVE_TAB_KEY,
        MAPS_INPUT_KEY,
        MAPS_URL,
        MAPS_RESULT_KEY,
        MAPS_RESULT_VALUE,
      ] as const,
    );

    await page.goto("/gpx");

    await expect(page.getByRole("button", { name: "Download GPX" })).toBeVisible(
      { timeout: 30_000 },
    );
    await expect(page.getByText("Waypoints", { exact: true })).toBeVisible();
    expect(resolveRequests).toEqual([]);
  });
});
