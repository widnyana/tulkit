import { expect, test, type Page } from "@playwright/test";

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

const FIXTURE_ROOT = "e2e/fixtures/gpx";

async function loadFixture(page: Page, path: string) {
  await page.goto("/gpx");
  const input = page.locator('input[type="file"]');
  await expect(input).toHaveCount(1, { timeout: 15_000 });
  await input.setInputFiles(`${FIXTURE_ROOT}/${path}`);
}

test.describe("GPX viewer fixtures", () => {
  test("renders brevet marks, an excerpted brief and one Source link", async ({
    page,
  }) => {
    await loadFixture(page, "west-java/bandung-lembang-brevet.gpx");

    const legend = page.getByRole("region", { name: "Map legend" });
    await expect(legend).toBeVisible({ timeout: 15_000 });
    await expect(legend.getByText(/21 marks/)).toBeVisible();

    const brief = page.getByRole("region", { name: "Route description" });
    await expect(brief).toBeVisible({ timeout: 15_000 });
    await expect(brief).toContainText("Brevet ini");
    await expect(
      brief.getByText("Show full description", { exact: true }),
    ).toBeVisible();
    await expect(brief.locator("a")).toHaveCount(1);
    await expect(
      brief.getByRole("link", { name: "Source", exact: true }),
    ).toBeVisible();
  });

  test("shows brevet creator and bounds in the metadata panel", async ({
    page,
  }) => {
    await loadFixture(page, "west-java/bandung-lembang-brevet.gpx");

    const metadata = page.getByRole("region", { name: "File metadata" });
    await expect(metadata).toBeVisible({ timeout: 15_000 });
    await expect(metadata.getByText("Created by", { exact: true })).toBeVisible();
    await expect(
      metadata.getByText("gps-touring", { exact: true }),
    ).toBeVisible();
    await expect(metadata.getByText("Bounds", { exact: true })).toBeVisible();
  });

  test("folds ciwidey symbols and caps the point list", async ({ page }) => {
    await loadFixture(page, "west-java/ciwidey-poi-1.0.gpx");

    const legend = page.getByRole("region", { name: "Map legend" });
    await expect(legend).toBeVisible({ timeout: 15_000 });
    await expect(legend.getByText("Camp 120", { exact: true })).toBeVisible();
    await expect(legend.getByText("Other 10", { exact: true })).toBeVisible();

    const summary = page.getByText("All points (250)", { exact: true });
    await expect(summary).toBeVisible({ timeout: 15_000 });
    await summary.click();
    await expect(
      page.getByText("First 200 of 250 points shown.", { exact: true }),
    ).toBeVisible();
  });

  test("groups Ubud water and camp waypoints", async ({ page }) => {
    await loadFixture(page, "bali/ubud-waypoints-1.1.gpx");

    const legend = page.getByRole("region", { name: "Map legend" });
    await expect(legend).toBeVisible({ timeout: 15_000 });
    await expect(legend.getByText("Water 40", { exact: true })).toBeVisible();
    await expect(legend.getByText("Camp 30", { exact: true })).toBeVisible();
  });

  test("renders popup text against the popover surface in dark mode", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await loadFixture(page, "west-java/bandung-lembang-brevet.gpx");

    const startMarker = page.getByRole("button", { name: /Start of route/ });
    await expect(startMarker).toBeVisible({ timeout: 15_000 });
    await startMarker.click();

    const popup = page.locator(".maplibregl-popup-content").first();
    await expect(popup).toBeVisible();

    const resolved = await page.evaluate(() => {
      const probe = document.createElement("div");
      document.body.append(probe);
      const resolve = (token: string) => {
        probe.style.color = `var(${token})`;
        return getComputedStyle(probe).color;
      };
      const values = {
        dark: document.documentElement.classList.contains("dark"),
        popover: resolve("--popover"),
        popoverForeground: resolve("--popover-foreground"),
      };
      probe.remove();
      return values;
    });

    expect(resolved.dark).toBe(true);

    const computed = await popup.evaluate((element) => {
      const style = getComputedStyle(element);
      return { color: style.color, background: style.backgroundColor };
    });

    expect(computed.color).toBe(resolved.popoverForeground);
    expect(computed.background).toBe(resolved.popover);
    expect(computed.color).not.toBe(computed.background);
  });
});
