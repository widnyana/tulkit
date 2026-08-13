import { expect, test } from "@playwright/test";

test.describe("QR code generator (QRCodeSVG)", () => {
  test("renders a QR for the input and the SVG download uses the forwarded ref", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err: Error) => pageErrors.push(err.message));

    await page.goto("/qr-gen");

    // QRCodeSVG renders the QR as an SVG. Discriminate from the lucide icons
    // (path-only) and the Next.js dev overlay (40x40, also has a rect) by
    // requiring a <rect> and excluding the overlay's viewBox.
    const qrSvg = page.locator(
      "svg:has(rect):not([viewBox='0 0 40 40'])",
    );

    // Enter content and confirm a QR with a real path is rendered.
    await page.locator("textarea").fill("https://tulkit.widnyana.web.id/");
    await expect(qrSvg).toBeVisible({ timeout: 10_000 });
    await expect(qrSvg.locator("path")).not.toHaveAttribute("d", "");

    // The SVG download serializes svgRef.current. A download firing with no
    // page error is the guard: if the forwarded ref were null, serialization
    // would throw and surface below.
    const downloads: string[] = [];
    page.on("download", (d) => downloads.push(d.suggestedFilename()));

    await page.getByText("Download QR Code").click();
    await expect.poll(() => downloads, { timeout: 10_000 }).not.toStrictEqual([]);

    expect(pageErrors, `uncaught page errors:\n${pageErrors.join("\n")}`).toEqual([]);
  });
});
