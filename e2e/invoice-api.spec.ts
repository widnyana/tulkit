import { expect, test } from "@playwright/test";
import { sampleInvoiceData } from "../lib/invoice/sample-data";

test.describe("POST /api/invoice-pdf", () => {
  const post = (request: import("@playwright/test").APIRequestContext, body: unknown) =>
    request.post("/api/invoice-pdf", {
      data: body,
      headers: { "Content-Type": "application/json" },
    });

  test("returns a PDF for valid invoice data", async ({ request }) => {
    const res = await post(request, sampleInvoiceData);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/pdf");
    const bytes = await res.body();
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  });

  test("returns structured validation errors for bad data", async ({ request }) => {
    const res = await post(request, {});
    expect(res.status()).toBe(400);
    const { error, issues } = await res.json();
    expect(error).toBe("Validation failed");
    expect(Array.isArray(issues)).toBe(true);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toHaveProperty("path");
    expect(issues[0]).toHaveProperty("message");
  });

  test("fills schema defaults (currency, templateKey)", async ({ request }) => {
    const res = await post(
      request,
      sampleInvoiceData,
    );
    // sample omits templateKey — schema defaults apply, so no 500/400 on
    // the render path proves defaults flowed through.
    expect(res.status()).toBe(200);
  });

  test("rejects invalid JSON body", async ({ request }) => {
    const res = await request.post("/api/invoice-pdf", {
      data: "not json{",
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
    const { error } = await res.json();
    expect(error).toBeTruthy();
  });

  test("rejects oversized bodies with 413", async ({ request }) => {
    const big = { ...sampleInvoiceData, notes: "x".repeat(3_000_000) };
    const res = await post(request, big);
    expect(res.status()).toBe(413);
    const { error } = await res.json();
    expect(error).toBeTruthy();
  });

  test("rejects remote URLs as logo (SSRF guard)", async ({ request }) => {
    const res = await post(request, {
      ...sampleInvoiceData,
      logo: "http://169.254.169.254/latest/meta-data/",
    });
    expect(res.status()).toBe(400);
    const { issues } = await res.json();
    expect(JSON.stringify(issues)).toContain("data URI");
  });

  test("is registered in /llms.txt guides", async ({ request }) => {
    const res = await request.get("/llms.txt");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain("- [Invoice Generator usage & API]");
    expect(text).toContain("/api/invoice-pdf");
  });
});
