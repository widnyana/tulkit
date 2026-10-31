import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyze,
  classifyFlexion,
  isPedalling,
  kneeFlexionDeg,
  legVisibleFor,
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

describe("legVisibleFor", () => {
  it("passes when the last 1.3 s are fully visible", () => {
    assert.equal(legVisibleFor(makeFrames(35, 40), 1000), true);
  });

  it("fails when the visible run is shorter than requested", () => {
    assert.equal(legVisibleFor(makeFrames(35, 20), 1000), false);
  });

  it("fails on empty input", () => {
    assert.equal(legVisibleFor([], 1000), false);
  });

  it("fails when the last frame is not fully visible", () => {
    const frames = makeFrames(35, 40);
    for (let i = frames.length - 10; i < frames.length; i++) {
      frames[i].knee.visibility = 0.1;
    }
    assert.equal(legVisibleFor(frames, 1000), false);
  });

  it("fails for 0.97 s of visibility at 1000 ms but passes at 900 ms", () => {
    const frames = makeFrames(35, 40);
    for (let i = 0; i < 10; i++) {
      frames[i].knee.visibility = 0.1;
    }
    assert.equal(legVisibleFor(frames, 1000), false);
    assert.equal(legVisibleFor(frames, 900), true);
  });
});

describe("isPedalling", () => {
  it("detects pedalling on synthetic strokes", () => {
    assert.equal(isPedalling(makeFrames(35, 60)), true);
  });

  it("fails on empty input", () => {
    assert.equal(isPedalling([]), false);
  });

  it("fails on static frames", () => {
    const frames: LegFrame[] = [];
    for (let i = 0; i < 60; i++) {
      frames.push({
        t: i * 33.3,
        hip: p(0.5, 0.2),
        knee: p(0.5, 0.5),
        ankle: p(0.5, 0.8),
      });
    }
    assert.equal(isPedalling(frames), false);
  });

  it("fails when visibility is too low", () => {
    assert.equal(isPedalling(makeFrames(35, 60, 0.1)), false);
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
