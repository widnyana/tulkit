import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BASE64_INPUT_LIMIT,
  parseBase64Request,
  runBase64Operation,
} from "./api.ts";
import { decodeBase64 } from "./base64.ts";
import type { Base64ApiRequest } from "./api.ts";

// Minimal valid JWT: header {"alg":"HS256","typ":"JWT"}, payload {"sub":"1"}
const JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.WvqUuMoytSSxLz8GmzOBKxUU3cbGtxDLDLYmPN4OdSg";

const req = (partial: Record<string, unknown>): Base64ApiRequest =>
  parseBase64Request(partial);

describe("parseBase64Request", () => {
  it("fills option defaults", () => {
    const r = req({ operation: "encode", input: "hi" });
    assert.deepEqual(r.options, { urlSafe: false, lineWrap: 0 });
  });

  it("rejects non-object bodies naming body", () => {
    for (const bad of [null, "x", 42, []]) {
      assert.throws(() => parseBase64Request(bad), /body/i);
    }
  });

  it("rejects unknown operation", () => {
    assert.throws(() => req({ operation: "nope", input: "x" }), /operation/);
  });

  it("rejects missing operation", () => {
    assert.throws(() => req({ input: "x" }), /operation/);
  });

  it("rejects non-string input", () => {
    assert.throws(() => req({ operation: "encode", input: 5 }), /input/);
  });

  it("rejects missing input", () => {
    assert.throws(() => req({ operation: "encode" }), /input/);
  });

  it("rejects input over limit", () => {
    assert.throws(
      () =>
        req({
          operation: "encode",
          input: "a".repeat(BASE64_INPUT_LIMIT + 1),
        }),
      /input/,
    );
  });

  it("rejects urlSafe: yes", () => {
    assert.throws(
      () =>
        req({
          operation: "encode",
          input: "x",
          options: { urlSafe: "yes" },
        }),
      /urlSafe/,
    );
  });

  it("rejects negative and fractional lineWrap", () => {
    for (const lineWrap of [-1, 1.5]) {
      assert.throws(
        () => req({ operation: "encode", input: "x", options: { lineWrap } }),
        /lineWrap/,
      );
    }
  });

  it("rejects unknown option keys", () => {
    assert.throws(
      () => req({ operation: "encode", input: "x", options: { wat: 1 } }),
      /wat/,
    );
  });
});

describe("runBase64Operation", async () => {
  it("encodes known vector", async () => {
    const r = req({ operation: "encode", input: "hello" });
    assert.equal(await runBase64Operation(r), "aGVsbG8=");
  });

  it("round-trips encode -> decode with UTF-8", async () => {
    const text = "héllo 🌍";
    const enc = await runBase64Operation(
      req({ operation: "encode", input: text }),
    );
    assert.equal(
      await runBase64Operation(req({ operation: "decode", input: enc })),
      text,
    );
  });

  it("urlSafe uses - _ alphabet without padding", async () => {
    const out = await runBase64Operation(
      req({
        operation: "encode",
        input: "subjects?&~",
        options: { urlSafe: true },
      }),
    );
    assert.ok(!/[+/=]/.test(out));
    assert.equal(decodeBase64(out), "subjects?&~");
  });

  it("lineWrap inserts newlines; 0 keeps single line", async () => {
    const wrapped = await runBase64Operation(
      req({
        operation: "encode",
        input: "a".repeat(20),
        options: { lineWrap: 4 },
      }),
    );
    const rows = wrapped.split("\n");
    for (const row of rows.slice(0, -1)) assert.equal(row.length, 4);
    assert.equal(wrapped.replaceAll("\n", "").length, 28);

    const flat = await runBase64Operation(
      req({
        operation: "encode",
        input: "a".repeat(20),
        options: { lineWrap: 0 },
      }),
    );
    assert.ok(!flat.includes("\n"));
  });

  it("round-trips hex -> base64 -> hex identity", async () => {
    const hex = "00ff10aabbcc";
    const b64 = await runBase64Operation(
      req({ operation: "hexToBase64", input: hex }),
    );
    assert.equal(
      await runBase64Operation(req({ operation: "base64ToHex", input: b64 })),
      hex,
    );
  });

  it("decodes a JWT into parseable header/payload JSON", async () => {
    const out = await runBase64Operation(
      req({ operation: "jwtDecode", input: JWT }),
    );
    const parsed = JSON.parse(out);
    assert.equal(parsed.header.alg, "HS256");
    assert.equal(parsed.payload.sub, "1");
    assert.equal(typeof parsed.signature, "string");
  });

  it("propagates invalid-input errors", async () => {
    await assert.rejects(() =>
      runBase64Operation(req({ operation: "decode", input: "!!!" })),
    );
    await assert.rejects(() =>
      runBase64Operation(req({ operation: "hexToBase64", input: "zz" })),
    );
  });
});
