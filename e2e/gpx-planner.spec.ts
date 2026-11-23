import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const DRAFT_KEY = "tulkit:gpx:route-draft:v1";

const ROUTE_DRAFT = {
  name: "Test loop",
  mode: "bicycling",
  points: [
    { lat: -7.782, lon: 110.369 },
    { lat: -7.783, lon: 110.372 },
  ],
  snappedPath: null,
};

const ROUTE_COORDINATES = [
  [110.369, -7.782],
  [110.3705, -7.7825],
  [110.372, -7.783],
];

test.describe("GPX route planner", () => {
  test("off-road click is rejected before it enters the plan", async ({
    page,
  }) => {
    await page.route("**/api/gpx/snap", async (route) => {
      await route.fulfill({
        json: { point: null, distance: null, reason: "no-road" },
      });
    });

    await page.goto("/gpx?tab=plan");

    const canvas = page.locator(".maplibregl-canvas");
    await expect(canvas).toBeVisible({ timeout: 30_000 });
    await canvas.click();

    const alert = page
      .getByRole("alert")
      .filter({ hasText: "No road there." });
    await expect(alert).toBeVisible({ timeout: 30_000 });

    await alert.getByRole("button", { name: "Dismiss" }).click();
    await expect(alert).toHaveCount(0);

    await expect(
      page.getByText("Click the map to drop your first route point."),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("table tbody tr")).toHaveCount(0);
  });

  test("snapped plan exports one road line with elevations", async ({
    page,
  }) => {
    await page.addInitScript(
      ([key, draft]) => {
        window.localStorage.setItem(key, JSON.stringify(draft));
      },
      [DRAFT_KEY, ROUTE_DRAFT] as const,
    );

    await page.route("**/api/gpx/routing", async (route) => {
      await route.fulfill({ json: { coordinates: ROUTE_COORDINATES } });
    });

    await page.route("**/api/gpx/elevation", async (route) => {
      const body = route.request().postDataJSON() as {
        points: { lat: number; lon: number }[];
      };
      await route.fulfill({
        json: {
          elevations: body.points.map((_, index) => 120 + index * 10),
        },
      });
    });

    await page.goto("/gpx?tab=plan");

    const planPanel = page.getByRole("tabpanel");
    await expect(planPanel.locator("tbody tr")).toHaveCount(2, {
      timeout: 30_000,
    });

    const downloadButton = planPanel.getByRole("button", {
      name: "Download GPX",
    });
    await expect(downloadButton).toBeEnabled({ timeout: 30_000 });

    const downloadPromise = page.waitForEvent("download", {
      timeout: 30_000,
    });
    await downloadButton.click();
    const download = await downloadPromise;
    const gpx = readFileSync(await download.path()).toString("utf8");

    expect(gpx).toContain("<trk>");
    expect(gpx).not.toContain("<rte>");
    expect(gpx).toContain("<ele>");
  });
});
