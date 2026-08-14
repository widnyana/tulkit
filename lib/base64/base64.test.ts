import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  base64ToHex,
  bytesToBase64,
  decodeBase64,
  encodeBase64,
  hexToBase64,
} from "./base64.ts";

const STD = { singleLine: true, lineWidth: 76, urlSafe: false };

describe("base64 text", () => {
  it("round-trips ASCII", () => {
    assert.equal(decodeBase64(encodeBase64("Hello", STD)), "Hello");
  });

  it("round-trips UTF-8 (emoji + accents)", () => {
    const text = "héllo 🌍";
    assert.equal(decodeBase64(encodeBase64(text, STD)), text);
  });

  it("wraps to fixed-width rows, last row may be shorter", () => {
    const text = "the quick brown fox jumps over the lazy dog";
    const wrapped = encodeBase64(text, { singleLine: false, lineWidth: 4, urlSafe: false });
    const rows = wrapped.split("\n");
    for (const row of rows.slice(0, -1)) assert.equal(row.length, 4);
    assert.ok(rows[rows.length - 1].length <= 4);
    assert.equal(decodeBase64(wrapped), text);
  });

  it("single-line output has no newlines", () => {
    const out = encodeBase64("a".repeat(200), STD);
    assert.ok(!out.includes("\n"));
  });

  it("throws on invalid base64 when decoding", () => {
    assert.throws(() => decodeBase64("!!!!"));
  });
});

describe("base64 url-safe", () => {
  const chars = new Uint8Array([0xfb, 0xff, 0xbf]); // standard base64 "+/+/"

  it("encodes with -_ and no padding when urlSafe", () => {
    assert.equal(bytesToBase64(chars, { singleLine: true, lineWidth: 0, urlSafe: true }), "-_-_");
    assert.equal(bytesToBase64(chars, { singleLine: true, lineWidth: 0, urlSafe: false }), "+/+/");
  });

  it("decodes url-safe input back to the original text", () => {
    const text = "subjects?_&data";
    const urlSafe = encodeBase64(text, { singleLine: true, lineWidth: 0, urlSafe: true });
    assert.equal(decodeBase64(urlSafe), text);
  });

  it("re-pads url-safe input whose length is not a multiple of 4", () => {
    assert.equal(decodeBase64("TQ"), "M"); // btoa("M") === "TQ==" ; unpadded here
  });

  it("still round-trips standard padded base64 (regression)", () => {
    assert.equal(decodeBase64(encodeBase64("padded", STD)), "padded");
  });
});

describe("hex <-> base64", () => {
  it("converts hex to base64 and back", () => {
    assert.equal(hexToBase64("deadbeef"), "3q2+7w==");
    assert.equal(base64ToHex("3q2+7w=="), "deadbeef");
  });

  it("accepts upper case and a 0x prefix", () => {
    assert.equal(hexToBase64("0xDEADBEEF"), "3q2+7w==");
  });

  it("throws on odd-length hex", () => {
    assert.throws(() => hexToBase64("abc"));
  });

  it("throws on non-hex characters", () => {
    assert.throws(() => hexToBase64("zz"));
  });

  it("handles empty input both directions", () => {
    assert.equal(hexToBase64(""), "");
    assert.equal(base64ToHex(""), "");
  });
});
