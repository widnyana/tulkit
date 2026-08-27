import { expect, test, type APIRequestContext } from "@playwright/test";
import { SITE_URL } from "../lib/site";
// lib/qrcodegen can't be loaded by node:test strip-types because of the
// vendored TS namespace). Parser validation lives in app/qr-gen/request.ts
// and is unit-tested separately.

test.describe("POST /api/qr", () => {
  const post = async (
    request: APIRequestContext,
    body: unknown,
  ) =>
    request.post("/api/qr", {
      data: body,
      headers: { "Content-Type": "application/json" },
    });

  test("returns an SVG for a plain request", async ({ request }) => {
    const res = await post(request, { text: "hello" });
    expect(res.status()).toBe(200);
    const { svg } = await res.json();
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain("<path d=");
    // deterministic
    const again = await post(request, { text: "hello" });
    expect((await again.json()).svg).toBe(svg);
  });

  test("applies styling options", async ({ request }) => {
    const res = await post(request, {
      text: `${SITE_URL}/`,
      shape: "circle",
      eyePatternShape: "diamond",
      gradient: "linear",
      colors: ["#ff0000", "#0000ff"],
      watermark: true,
      size: 1024,
    });
    expect(res.status()).toBe(200);
    const { svg } = await res.json();
    expect(svg).toContain('fill="url(#qr-grad)"');
    expect(svg).toContain("<linearGradient");
    expect(svg).toContain('height="1064"'); // 1024 + 40 watermark band
    expect(svg).toContain("Generated using");
  });

  test("capacity overflow maps to a named 400", async ({ request }) => {
    const res = await post(request, {
      text: "a".repeat(2000),
      errorCorrection: "HIGH",
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBeTruthy();
  });
});
