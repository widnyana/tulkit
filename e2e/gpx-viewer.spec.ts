import { expect, test } from "@playwright/test";

const SAMPLE_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="tulkit" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Coastal test</name>
    <desc>Metadata render check</desc>
    <time>2024-01-02T03:04:05Z</time>
  </metadata>
  <wpt lat="0" lon="0">
    <name>Alpha</name>
  </wpt>
  <wpt lat="0.01" lon="0.01">
    <name>Omega</name>
  </wpt>
  <trk>
    <name>Test ride</name>
    <trkseg>
      <trkpt lat="0" lon="0"><ele>10</ele></trkpt>
      <trkpt lat="0.005" lon="0.005"><ele>40</ele></trkpt>
      <trkpt lat="0.01" lon="0.011"><ele>10</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

test.describe("GPX viewer map", () => {
  test("renders the legend and the summary from parsed geometry", async ({
    page,
  }) => {
    await page.goto("/gpx");
    await page.locator("textarea").first().fill(SAMPLE_GPX);

    const metadata = page.getByRole("region", { name: "File metadata" });
    await expect(metadata).toBeVisible({ timeout: 15_000 });
    await expect(
      metadata.getByRole("heading", { name: "Coastal test" }),
    ).toBeVisible();
    await expect(metadata).toContainText("Metadata render check");
    await expect(metadata).toContainText("2024-01-02T03:04:05Z");

    const legend = page.getByRole("region", { name: "Map legend" });
    await expect(legend).toBeVisible({ timeout: 15_000 });
    await expect(legend.getByText("Start", { exact: true })).toBeVisible();
    await expect(legend.getByText("Finish", { exact: true })).toBeVisible();
    await expect(
      legend.getByText("Direction of travel", { exact: true }),
    ).toBeVisible();
    await expect(legend.getByText("Test ride", { exact: true })).toBeVisible();

    const caption = page.locator("figcaption");
    await expect(caption).toContainText(/Start 0\.00000, 0\.00000/);
    await expect(caption).toContainText(/Finish 0\.01000, 0\.01100/);

    const distanceTile = page
      .getByText("Distance", { exact: true })
      .locator("..");
    await expect(distanceTile).toContainText(/km/);

    await legend.focus();
    await expect(legend).toBeFocused();
  });

  test("lists waypoints outside the canvas", async ({ page }) => {
    await page.goto("/gpx");
    await page.locator("textarea").first().fill(SAMPLE_GPX);

    const summary = page.getByText("All points (2)", { exact: true });
    await expect(summary).toBeVisible({ timeout: 15_000 });
    await summary.click();
    await expect(page.getByText("Alpha", { exact: true })).toBeVisible();
  });
});
