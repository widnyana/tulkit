import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decodeJwt } from "./jwt.ts";

// Standard HS256 sample token (jwt.io example).
const SAMPLE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" +
  ".eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ" +
  ".SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

describe("decodeJwt", () => {
  it("decodes header and payload of a valid token", () => {
    const { header, payload, signature } = decodeJwt(SAMPLE);
    assert.equal(JSON.parse(header).alg, "HS256");
    assert.equal(JSON.parse(header).typ, "JWT");
    assert.equal(JSON.parse(payload).name, "John Doe");
    assert.equal(JSON.parse(payload).sub, "1234567890");
    assert.equal(signature, "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c");
  });

  it("pretty-prints the JSON parts", () => {
    assert.ok(decodeJwt(SAMPLE).payload.includes("\n"));
  });

  it("throws when the token does not have 3 parts", () => {
    assert.throws(() => decodeJwt("a.b"), /expected 3/);
  });

  it("throws when a part is not valid JSON", () => {
    // valid base64url of "not json" in the payload slot
    const bad = "eyJhbGciOiJIUzI1NiJ9.bm90IGpzb24.sig";
    assert.throws(() => decodeJwt(bad));
  });
});
