import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseQrRequest } from "./request.ts";
import type { QrApiRequest } from "./request.ts";
const req = (partial: Record<string, unknown>): QrApiRequest =>
  parseQrRequest(partial);

const valid = (extra: Record<string, unknown> = {}) => ({
  text: "hello",
  ...extra,
});

describe("parseQrRequest", () => {
  it("fills defaults", () => {
    const r = req(valid());
    assert.equal(r.errorCorrection, "MEDIUM");
    assert.equal(r.size, 512);
    assert.equal(r.shapeOptions.shape, "square");
    assert.equal(r.shapeOptions.eyePatternShape, "square");
    assert.deepEqual(
      [r.shapeOptions.gap, r.shapeOptions.eyePatternGap],
      [0, 0],
    );
    assert.equal(r.margin, 4);
    assert.deepEqual(r.colors, ["#000000"]);
    assert.equal(r.watermark, false);
  });

  it("rejects non-object bodies", () => {
    for (const bad of [null, "x", 42, []]) {
      assert.throws(() => parseQrRequest(bad), /body/i);
    }
  });

  it("rejects missing or non-string text naming the field", () => {
    assert.throws(() => parseQrRequest({}), /text/);
    assert.throws(() => parseQrRequest({ text: 7 }), /text/);
    assert.throws(() => parseQrRequest({ text: "" }), /text/);
  });

  it("rejects bad errorCorrection naming the field", () => {
    assert.throws(
      () => req(valid({ errorCorrection: "nope" })),
      /errorCorrection/,
    );
  });

  it("enforces size bounds naming size", () => {
    assert.throws(() => req(valid({ size: 32 })), /\bsize\b/);
    assert.throws(() => req(valid({ size: 4096 })), /\bsize\b/);
    assert.ok(req(valid({ size: 64 })));
    assert.ok(req(valid({ size: 2048 })));
  });

  it("enforces gap bounds naming gap", () => {
    assert.throws(() => req(valid({ gap: -1 })), /gap/);
    assert.throws(() => req(valid({ gap: 5 })), /gap/);
  });

  it("enforces margin bounds naming margin", () => {
    assert.throws(() => req(valid({ margin: -1 })), /margin/);
    assert.throws(() => req(valid({ margin: 11 })), /margin/);
  });

  it("validates hex colors naming colors", () => {
    assert.throws(
      () => req(valid({ gradient: "linear", colors: ["red"] })),
      /colors/,
    );
    assert.throws(
      () => req(valid({ gradient: "linear", colors: ["#12345", "#abcdef"] })),
      /colors/,
    );
    assert.ok(req(valid({ gradient: "linear", colors: ["#f00", "#00ff00"] })));
  });

  it("requires >=2 colors when gradient is set", () => {
    assert.throws(
      () => req(valid({ gradient: "radial", colors: ["#000000"] })),
      /gradient requires at least 2 colors/,
    );
  });

  it("rejects unknown option keys naming the key", () => {
    assert.throws(() => req(valid({ wat: 1 })), /wat/);
  });

  it("logoImage requires logoSize; allows data and https URLs only", () => {
    assert.throws(
      () => req(valid({ logoImage: "data:image/png;base64,iVBOR" })),
      /logoSize/,
    );
    assert.throws(
      () => req(valid({ logoImage: "http://x/y.png", logoSize: 100 })),
      /logoImage/,
    );
    assert.ok(
      req(
        valid({
          logoImage: "https://example.com/logo.png",
          logoSize: 100,
        }),
      ),
    );
  });

  it("caps logoSize at half the canvas", () => {
    assert.throws(
      () => req(valid({ logoImage: "data:image/png;base64,x", logoSize: 300 })),
      /logoSize/,
    );
    assert.ok(
      req(valid({ logoImage: "data:image/png;base64,x", logoSize: 256 })),
    );
  });
});
