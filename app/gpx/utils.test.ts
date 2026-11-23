import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allPoints, computeBounds, trackSegmentCount } from "./utils.ts";
import type { ParsedGpx } from "./types.ts";

const empty: ParsedGpx = { waypoints: [], routes: [], tracks: [], skipped: 0 };

describe("computeBounds", () => {
  it("returns null for geometry with no points", () => {
    assert.equal(computeBounds(empty), null);
  });

  it("collapses to a single point when there is exactly one", () => {
    const parsed: ParsedGpx = {
      ...empty,
      waypoints: [{ lat: 10, lon: 20 }],
    };
    assert.deepEqual(computeBounds(parsed), [
      [20, 10],
      [20, 10],
    ]);
  });

  it("spans waypoints, route points, and track points together", () => {
    const parsed: ParsedGpx = {
      waypoints: [{ lat: 0, lon: 0 }],
      routes: [{ points: [{ lat: 10, lon: -5 }] }],
      tracks: [
        {
          segments: [
            [
              { lat: -10, lon: 15 },
              { lat: 5, lon: 5 },
            ],
          ],
        },
      ],
      skipped: 0,
    };
    assert.deepEqual(computeBounds(parsed), [
      [-5, -10],
      [15, 10],
    ]);
  });
});

describe("allPoints", () => {
  it("flattens waypoints, route points, and every track segment", () => {
    const parsed: ParsedGpx = {
      waypoints: [{ lat: 1, lon: 1 }],
      routes: [{ points: [{ lat: 2, lon: 2 }] }],
      tracks: [{ segments: [[{ lat: 3, lon: 3 }], [{ lat: 4, lon: 4 }]] }],
      skipped: 0,
    };
    assert.equal(allPoints(parsed).length, 4);
  });
});

describe("trackSegmentCount", () => {
  it("sums segments across every track", () => {
    const parsed: ParsedGpx = {
      ...empty,
      tracks: [{ segments: [[], []] }, { segments: [[]] }],
    };
    assert.equal(trackSegmentCount(parsed), 3);
  });

  it("is zero when there are no tracks", () => {
    assert.equal(trackSegmentCount(empty), 0);
  });
});
