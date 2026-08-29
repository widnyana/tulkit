import assert from "node:assert/strict";
import { test } from "node:test";
import { formatCurrency } from "./formatCurrency.ts";

test("ASCII symbols stay tight against the amount", () => {
  assert.equal(formatCurrency(1234.5, "$"), "$1.234,50");
  assert.equal(formatCurrency(1000, "Rp"), "Rp1.000,00");
});

test("non-ASCII symbols get a space so the glyph cannot collide", () => {
  assert.equal(formatCurrency(890, "€"), "€ 890,00");
  assert.equal(formatCurrency(890, "£"), "£ 890,00");
});

test("separators pass through", () => {
  assert.equal(formatCurrency(1234.5, "$", ".", ","), "$1,234.50");
});

test("defaults match the schema defaults", () => {
  assert.equal(formatCurrency(5), "$5,00");
});
