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
});
