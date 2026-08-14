import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decodeBase64, encodeBase64 } from "./base64.ts";

describe("base64", () => {
  it("round-trips ASCII", () => {
    const b64 = encodeBase64("Hello", { singleLine: true, lineWidth: 76 });
    assert.equal(decodeBase64(b64), "Hello");
  });

  it("round-trips UTF-8 (emoji + accents)", () => {
    const text = "héllo 🌍";
    const b64 = encodeBase64(text, { singleLine: true, lineWidth: 76 });
    assert.equal(decodeBase64(b64), text);
  });

  it("wraps to fixed-width rows, last row may be shorter", () => {
    const text = "the quick brown fox jumps over the lazy dog";
    const wrapped = encodeBase64(text, { singleLine: false, lineWidth: 4 });
    const rows = wrapped.split("\n");
    for (const row of rows.slice(0, -1)) assert.equal(row.length, 4);
    assert.ok(rows[rows.length - 1].length <= 4);
    assert.equal(decodeBase64(wrapped), text);
  });

  it("single-line output has no newlines", () => {
    const text = "a".repeat(200);
    const out = encodeBase64(text, { singleLine: true, lineWidth: 76 });
    assert.ok(!out.includes("\n"));
  });

  it("throws on invalid base64 when decoding", () => {
    assert.throws(() => decodeBase64("!!!!"));
  });
});
