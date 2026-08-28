import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { invoiceDataSchema } from "./validation.ts";

// Minimal well-formed invoice; each test spreads and mutates it.
const validInvoice = {
  sender: { name: "Acme", address: "1 St", email: "a@b.com", phone: "555" },
  recipient: { name: "Bob", address: "2 St" },
  invoiceNumber: "INV-1",
  issueDate: "2026-08-13",
  dueDate: "2026-08-20",
  items: [{ id: "1", description: "Work", quantity: 2, unitPrice: 50 }],
  taxEnabled: false,
  taxRate: 10,
} as const;

const codes = (result: {
  success: boolean;
  error?: { issues: { code: string }[] };
}) => result.error?.issues.map((i) => i.code) ?? [];

describe("invoiceDataSchema", () => {
  it("accepts a complete invoice and applies field defaults", () => {
    const r = invoiceDataSchema.safeParse(validInvoice);
    assert.ok(r.success, "expected valid invoice to parse");
    if (r.success) {
      assert.equal(r.data.templateKey, "default");
      assert.equal(r.data.currency, "$");
      assert.equal(r.data.decimalSeparator, ",");
      assert.equal(r.data.thousandSeparator, ".");
    }
  });

  it("treats an empty optional recipient email as not-provided (valid)", () => {
    const r = invoiceDataSchema.safeParse({
      ...validInvoice,
      recipient: { name: "Bob", address: "2 St", email: "", phone: "" },
    });
    assert.ok(r.success);
  });

  it("rejects a malformed recipient email with invalid_format", () => {
    const r = invoiceDataSchema.safeParse({
      ...validInvoice,
      recipient: { name: "Bob", address: "2 St", email: "not-an-email" },
    });
    assert.ok(!r.success);
    assert.ok(codes(r).includes("invalid_format"));
  });

  it("rejects empty required sender fields", () => {
    const r = invoiceDataSchema.safeParse({
      ...validInvoice,
      sender: { name: "", address: "1 St", email: "a@b.com", phone: "555" },
    });
    assert.ok(!r.success);
    assert.ok(codes(r).includes("too_small"));
  });

  it("rejects negative quantity / unit price", () => {
    const r = invoiceDataSchema.safeParse({
      ...validInvoice,
      items: [{ id: "1", description: "X", quantity: -1, unitPrice: 0 }],
    });
    assert.ok(!r.success);
    assert.ok(codes(r).includes("too_small"));
  });

  it("rejects tax rate outside [0, 100]", () => {
    assert.ok(
      !invoiceDataSchema.safeParse({ ...validInvoice, taxRate: 150 }).success,
    );
    assert.ok(
      !invoiceDataSchema.safeParse({ ...validInvoice, taxRate: -5 }).success,
    );
  });

  it("rejects an unknown template key", () => {
    const r = invoiceDataSchema.safeParse({
      ...validInvoice,
      templateKey: "fancy",
    });
    assert.ok(!r.success, "unknown template key should be rejected");
  });

  it("accepts a base64 image data URI logo", () => {
    const r = invoiceDataSchema.safeParse({
      ...validInvoice,
      logo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==",
    });
    assert.ok(r.success, "expected data URI logo to parse");
  });

  it("rejects remote URLs as logo (SSRF guard) and oversized images", () => {
    for (const logo of [
      "http://169.254.169.254/latest/meta-data/",
      "https://evil.example/logo.png",
      "data:text/html;base64,PGh0bWw+",
      "file:///etc/passwd",
      `data:image/png;base64,${"A".repeat(3_000_000)}`,
    ]) {
      const r = invoiceDataSchema.safeParse({ ...validInvoice, logo });
      assert.ok(
        !r.success,
        `expected logo to be rejected: ${logo.slice(0, 40)}`,
      );
    }
  });

  it("enforces length caps (DoS bound)", () => {
    const r = invoiceDataSchema.safeParse({
      ...validInvoice,
      items: [
        { id: "1", description: "x".repeat(2001), quantity: 1, unitPrice: 1 },
      ],
    });
    assert.ok(!r.success);
    assert.ok(codes(r).includes("too_big"));

    const tooMany = invoiceDataSchema.safeParse({
      ...validInvoice,
      items: Array.from({ length: 501 }, (_, i) => ({
        id: String(i),
        description: "x",
        quantity: 1,
        unitPrice: 1,
      })),
    });
    assert.ok(!tooMany.success);
  });

  it("rejects non-ISO dates", () => {
    for (const date of ["13/06/2025", "June 13", "", "2025-6-1"]) {
      const r = invoiceDataSchema.safeParse({
        ...validInvoice,
        issueDate: date,
      });
      assert.ok(!r.success, `expected issueDate to be rejected: "${date}"`);
    }
  });
});
