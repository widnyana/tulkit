import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyze,
  classifyFlexion,
  kneeFlexionDeg,
  median,
  movingAverage,
} from "./utils.ts";
import type { LegFrame, Point } from "./types.ts";

const p = (x: number, y: number, visibility = 1): Point => ({
  x,
  y,
  visibility,
});

/** Synthetic pedal strokes: flexion varies 0..25 deg above minFlex over each 30-frame cycle. */
const makeFrames = (minFlex: number, n = 120, visibility = 1): LegFrame[] => {
  const frames: LegFrame[] = [];
  for (let i = 0; i < n; i++) {
    const phase = (2 * Math.PI * i) / 30;
    const flex = minFlex + (25 * (1 - Math.cos(phase))) / 2;
    const a = (20 * Math.PI) / 180;
    const b = a - (flex * Math.PI) / 180;
    const hip = { x: 0.5, y: 0.2, visibility };
    const knee = {
      x: 0.5 + 0.3 * Math.sin(a),
      y: 0.2 + 0.3 * Math.cos(a),
      visibility,
    };
    const ankle = {
      x: knee.x + 0.3 * Math.sin(b),
      y: knee.y + 0.3 * Math.cos(b),
      visibility,
    };
    frames.push({ t: i * 33.3, hip, knee, ankle });
  }
  return frames;
};

describe("kneeFlexionDeg", () => {
  it("gives 0 for a straight leg", () => {
    const v = kneeFlexionDeg(p(0, 0), p(0, 1), p(0, 2));
    assert.ok(Math.abs(v) < 1e-9);
  });

  it("gives 90 for a right angle at the knee", () => {
    const v = kneeFlexionDeg(p(0, 0), p(0, 1), p(1, 1));
    assert.ok(Math.abs(v - 90) < 1e-9);
  });

  it("gives 0 for a zero-length vector", () => {
    assert.equal(kneeFlexionDeg(p(0, 0), p(0, 0), p(1, 1)), 0);
  });
});

describe("movingAverage", () => {
  it("averages over the window with edge handling", () => {
    assert.deepEqual(movingAverage([1, 2, 3, 4, 5], 3), [1.5, 2, 3, 4, 4.5]);
  });
});

describe("median", () => {
  it("returns the middle value", () => {
    assert.equal(median([3, 1, 2]), 2);
  });

  it("returns the mean of the two middle values", () => {
    assert.equal(median([1, 2, 3, 4]), 2.5);
  });
});

describe("classifyFlexion", () => {
  it("classifies against the target window", () => {
    assert.equal(classifyFlexion(29.9), "lower");
    assert.equal(classifyFlexion(30), "ok");
    assert.equal(classifyFlexion(40), "ok");
    assert.equal(classifyFlexion(40.1), "raise");
  });
});

describe("analyze", () => {
  it("finds pedal cycles and flexion in the target window", () => {
    const result = analyze(makeFrames(35));
    assert.ok(result);
    assert.ok(Math.abs(result.flexionAtBdcDeg - 35) < 2);
    assert.ok(result.cycles >= 3);
    assert.equal(result.keptRatio, 1);
    assert.equal(result.hint, "ok");
  });

  it("suggests raising the saddle when too bent", () => {
    assert.equal(analyze(makeFrames(50))?.hint, "raise");
  });

  it("suggests lowering the saddle when too straight", () => {
    assert.equal(analyze(makeFrames(20))?.hint, "lower");
  });

  it("returns null with fewer than 30 frames", () => {
    assert.equal(analyze(makeFrames(35, 20)), null);
  });

  it("returns null when visibility is too low", () => {
    assert.equal(analyze(makeFrames(35, 120, 0.1)), null);
  });
});
