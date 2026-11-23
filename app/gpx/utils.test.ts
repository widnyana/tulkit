import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allPoints,
  computeBounds,
  pathEndpoints,
  trackSegmentCount,
} from "./utils.ts";
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

describe("pathEndpoints", () => {
  it("uses the first point of the first segment and the last point of the last", () => {
    const parsed: ParsedGpx = {
      ...empty,
      tracks: [
        {
          segments: [
            [
              { lat: 1, lon: 1 },
              { lat: 2, lon: 2 },
            ],
            [{ lat: 3, lon: 3 }],
          ],
        },
        { segments: [[{ lat: 9, lon: 9 }]] },
      ],
    };
    assert.deepEqual(pathEndpoints(parsed), {
      start: { lat: 1, lon: 1 },
      end: { lat: 9, lon: 9 },
    });
  });

  it("skips empty segments before picking the endpoints", () => {
    const parsed: ParsedGpx = {
      ...empty,
      tracks: [{ segments: [[], [{ lat: 5, lon: 5 }], []] }],
    };
    assert.deepEqual(pathEndpoints(parsed), {
      start: { lat: 5, lon: 5 },
      end: { lat: 5, lon: 5 },
    });
  });

  it("falls back to route points when there is no track", () => {
    const parsed: ParsedGpx = {
      ...empty,
      routes: [
        {
          points: [
            { lat: 1, lon: 1 },
            { lat: 2, lon: 2 },
          ],
        },
      ],
    };
    assert.deepEqual(pathEndpoints(parsed), {
      start: { lat: 1, lon: 1 },
      end: { lat: 2, lon: 2 },
    });
  });

  it("returns null when only waypoints or a single route point exist", () => {
    assert.equal(
      pathEndpoints({ ...empty, waypoints: [{ lat: 1, lon: 1 }] }),
      null,
    );
    assert.equal(
      pathEndpoints({ ...empty, routes: [{ points: [{ lat: 1, lon: 1 }] }] }),
      null,
    );
  });
});
