import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sampleInvoiceData } from "./sample-data.ts";
import { invoiceDataSchema } from "./validation.ts";

describe("sampleInvoiceData", () => {
  it("stays schema-valid (the save path accepts it)", () => {
    const result = invoiceDataSchema.safeParse(sampleInvoiceData);
    assert.ok(
      result.success,
      `expected sample to parse: ${result.success ? "" : JSON.stringify(result.error.issues)}`,
    );
  });

  it("satisfies the preview validity gate (required fields non-empty)", () => {
    const { sender, recipient, invoiceNumber, issueDate, dueDate } =
      sampleInvoiceData;
    const required = [
      sender.name,
      sender.address,
      sender.email,
      recipient.name,
      recipient.address,
      invoiceNumber,
      issueDate,
      dueDate,
    ];
    for (const value of required) {
      assert.ok(value.trim().length > 0, "required preview field is empty");
    }
    assert.ok(sampleInvoiceData.items.length > 0, "sample needs >=1 item");
  });

  it("respects zod scalar constraints (tax range, separators, currency)", () => {
    const { taxRate, decimalSeparator, thousandSeparator, currency } =
      sampleInvoiceData;
    assert.ok(taxRate >= 0 && taxRate <= 100, "taxRate out of [0, 100]");
    assert.equal(
      decimalSeparator?.length,
      1,
      "decimal separator must be 1 char",
    );
    assert.equal(
      thousandSeparator?.length,
      1,
      "thousand separator must be 1 char",
    );
    assert.ok((currency ?? "").length <= 3, "currency symbol too long");
  });

  it("carries the intended template pressure (stresstest-lite profile)", () => {
    // Mixed note optionality: no-note items interleaved with short/long ones.
    const noteless = sampleInvoiceData.items.filter((i) => !i.notes).length;
    assert.ok(noteless >= 3, "expected >=3 items without notes (mixed pattern)");
    const longest = Math.max(
      ...sampleInvoiceData.items.map((i) => i.notes?.length ?? 0),
    );
    assert.ok(longest > 300, "expected at least one long item note");
    // Fractional quantity, fractional tax, non-ASCII currency.
    assert.ok(
      sampleInvoiceData.items.some((i) => !Number.isInteger(i.quantity)),
      "expected a fractional quantity",
    );
    assert.ok(
      !Number.isInteger(sampleInvoiceData.taxRate),
      "expected a fractional tax rate",
    );
    assert.notEqual(sampleInvoiceData.currency, "$", "expected non-USD symbol");
    // Every optional field populated.
    const p = sampleInvoiceData.paymentInfo;
    assert.ok(p, "paymentInfo required");
    for (const v of [
      p.bankName,
      p.accountNumber,
      p.routingCode,
      sampleInvoiceData.recipient.email,
      sampleInvoiceData.recipient.phone,
    ]) {
      assert.ok(v, "optional contact/payment field must be populated");
    }
    assert.ok(
      (p.paymentMethods?.length ?? 0) >= 3 && p.paymentQRCode,
      "expected >=3 payment methods and a QR code",
    );
    assert.equal(sampleInvoiceData.showBranding, true);
  });

  it("includes generated logo and payment QR data-URL images", () => {
    assert.ok(
      sampleInvoiceData.logo?.startsWith("data:image/"),
      "logo must be a data URL",
    );
    assert.ok(
      sampleInvoiceData.paymentInfo?.paymentQRCode?.startsWith("data:image/"),
      "paymentQRCode must be a data URL",
    );
  });
});
