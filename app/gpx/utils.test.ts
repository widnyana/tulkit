import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allPoints,
  computeBounds,
  distanceMeters,
  elevationGain,
  formatDistance,
  LINE_PALETTE,
  lineGroups,
  pathDistanceMeters,
  pathEndpoints,
  safeExternalHref,
  totalDistanceMeters,
  trackSegmentCount,
  waypointsToParsedGpx,
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

describe("distanceMeters", () => {
  it("measures one degree of latitude as about 111.2 km", () => {
    const distance = distanceMeters({ lat: 0, lon: 0 }, { lat: 1, lon: 0 });
    assert.ok(Math.abs(distance - 111195) < 1000);
  });

  it("is zero for identical points", () => {
    assert.equal(distanceMeters({ lat: 12, lon: 34 }, { lat: 12, lon: 34 }), 0);
  });

  it("is zero when any coordinate is not finite", () => {
    assert.equal(
      distanceMeters({ lat: Number.NaN, lon: 0 }, { lat: 1, lon: 1 }),
      0,
    );
  });
});

describe("pathDistanceMeters", () => {
  it("sums every leg and is zero for fewer than two points", () => {
    const points = [
      { lat: 1, lon: 2 },
      { lat: 3, lon: 4 },
      { lat: 5, lon: 6 },
    ];
    const legs =
      distanceMeters(points[0], points[1]) +
      distanceMeters(points[1], points[2]);

    assert.ok(Math.abs(pathDistanceMeters(points) - legs) < 1e-6);
    assert.equal(pathDistanceMeters([]), 0);
    assert.equal(pathDistanceMeters([points[0]]), 0);
  });
});

describe("formatDistance", () => {
  it("renders metres below a kilometre and kilometres above it", () => {
    assert.equal(formatDistance(0), "0 m");
    assert.equal(formatDistance(999), "999 m");
    assert.equal(formatDistance(1000), "1.0 km");
    assert.equal(formatDistance(12400), "12.4 km");
  });

  it("renders zero for negative and non-finite input", () => {
    assert.equal(formatDistance(-5), "0 m");
    assert.equal(formatDistance(Number.NaN), "0 m");
  });
});

describe("lineGroups", () => {
  const parsed: ParsedGpx = {
    ...empty,
    tracks: [
      {
        name: "Climb",
        segments: [
          [
            { lat: 0, lon: 0 },
            { lat: 1, lon: 0 },
          ],
          [],
        ],
      },
      { segments: [[{ lat: 2, lon: 2 }]] },
    ],
    routes: [
      {
        points: [
          { lat: 3, lon: 3 },
          { lat: 4, lon: 4 },
        ],
      },
      { name: "Detour", points: [{ lat: 5, lon: 5 }] },
    ],
  };

  it("lists tracks first, then routes, and drops empty geometry", () => {
    const groups = lineGroups(parsed);
    assert.equal(groups.length, 3);
    assert.deepEqual(
      groups.map((group) => group.id),
      ["track-0", "track-1", "route-0"],
    );
    assert.deepEqual(
      groups.map((group) => group.kind),
      ["track", "track", "route"],
    );
    assert.equal(groups[0].segments.length, 1);
  });

  it("assigns palette colours in order", () => {
    const groups = lineGroups(parsed);
    assert.deepEqual(
      groups.map((group) => group.color),
      LINE_PALETTE.slice(0, groups.length),
    );
  });

  it("uses the name when present and per-kind numbering otherwise", () => {
    const unnamed = lineGroups({
      ...empty,
      tracks: [{ segments: [[{ lat: 0, lon: 0 }]] }],
      routes: [
        {
          points: [
            { lat: 1, lon: 1 },
            { lat: 2, lon: 2 },
          ],
        },
      ],
    });
    assert.deepEqual(
      unnamed.map((group) => group.label),
      ["Track 1", "Route 1"],
    );

    const named = lineGroups(parsed);
    assert.equal(named[0].label, "Climb");
    assert.equal(named[1].label, "Track 2");
    assert.equal(named[2].label, "Route 1");
  });

  it("sums consecutive point distances within each group", () => {
    const groups = lineGroups(parsed);
    assert.ok(groups[0].distanceMeters > 111000);
    assert.equal(groups[1].distanceMeters, 0);
    assert.ok(groups[2].distanceMeters > 0);
    assert.equal(
      totalDistanceMeters(parsed),
      groups.reduce((total, group) => total + group.distanceMeters, 0),
    );
  });
});

describe("elevationGain", () => {
  it("sums only positive deltas", () => {
    const parsed: ParsedGpx = {
      ...empty,
      tracks: [
        {
          segments: [
            [
              { lat: 0, lon: 0, ele: 10 },
              { lat: 0, lon: 1, ele: 25 },
              { lat: 0, lon: 2, ele: 20 },
              { lat: 0, lon: 3, ele: 40 },
            ],
          ],
        },
      ],
    };
    assert.equal(elevationGain(parsed), 35);
  });

  it("restarts the chain after a point without ele", () => {
    const parsed: ParsedGpx = {
      ...empty,
      tracks: [
        {
          segments: [
            [
              { lat: 0, lon: 0, ele: 10 },
              { lat: 0, lon: 1, ele: 20 },
              { lat: 0, lon: 2 },
              { lat: 0, lon: 3, ele: 5 },
              { lat: 0, lon: 4, ele: 15 },
            ],
          ],
        },
      ],
    };
    assert.equal(elevationGain(parsed), 20);
  });

  it("returns null with fewer than two elevation samples", () => {
    const parsed: ParsedGpx = {
      ...empty,
      tracks: [{ segments: [[{ lat: 0, lon: 0, ele: 10 }]] }],
    };
    assert.equal(elevationGain(parsed), null);
    assert.equal(elevationGain(empty), null);
  });

  it("ignores GPS/barometer jitter below the noise threshold", () => {
    const parsed: ParsedGpx = {
      ...empty,
      tracks: [
        {
          segments: [
            [
              { lat: 0, lon: 0, ele: 100 },
              { lat: 0, lon: 1, ele: 100.8 },
              { lat: 0, lon: 2, ele: 99.5 },
              { lat: 0, lon: 3, ele: 101.2 },
              { lat: 0, lon: 4, ele: 100.1 },
            ],
          ],
        },
      ],
    };
    assert.equal(elevationGain(parsed), 0);
  });

  it("still counts a real climb made of many small jittery steps", () => {
    const points = [{ lat: 0, lon: 0, ele: 0 }];
    for (let i = 1; i <= 20; i++) {
      // +0.6 m real climb per step, jitter-sized relative to each other but
      // a genuine 12 m ascent overall: each 3 m threshold crossing banks its
      // climb, and the final sub-threshold remainder (1.2 m) is the known,
      // bounded cost of filtering noise at this granularity.
      points.push({ lat: 0, lon: i, ele: i * 0.6 });
    }
    const parsed: ParsedGpx = {
      ...empty,
      tracks: [{ segments: [points] }],
    };
    assert.equal(elevationGain(parsed), 11);
  });
});

describe("waypointsToParsedGpx", () => {
  const waypoints = [
    { lat: 10.5, lon: 20.5, name: "Start" },
    { lat: 15.75, lon: 30.25, name: "End" },
  ];

  it("wraps 2+ points as a straight route with no road route given", () => {
    const parsed = waypointsToParsedGpx(waypoints);
    assert.equal(parsed.routes.length, 1);
    assert.equal(parsed.tracks.length, 0);
    assert.deepEqual(parsed.routes[0].points, waypoints);
  });

  it("does not synthesize a route for a single point", () => {
    const parsed = waypointsToParsedGpx([waypoints[0]]);
    assert.equal(parsed.routes.length, 0);
    assert.equal(parsed.tracks.length, 0);
  });

  it("uses the road route as a track when one is provided", () => {
    const roadRoute = [
      { lat: 10.5, lon: 20.5 },
      { lat: 12, lon: 24 },
      { lat: 15.75, lon: 30.25 },
    ];
    const parsed = waypointsToParsedGpx(waypoints, roadRoute);
    assert.equal(parsed.routes.length, 0);
    assert.equal(parsed.tracks.length, 1);
    assert.deepEqual(parsed.tracks[0].segments, [roadRoute]);
    assert.deepEqual(parsed.waypoints, waypoints);
  });

  it("falls back to the straight route when the road route is too short", () => {
    const parsed = waypointsToParsedGpx(waypoints, [waypoints[0]]);
    assert.equal(parsed.tracks.length, 0);
    assert.equal(parsed.routes.length, 1);
  });

  it("falls back to the straight route when the road route is null", () => {
    const parsed = waypointsToParsedGpx(waypoints, null);
    assert.equal(parsed.tracks.length, 0);
    assert.equal(parsed.routes.length, 1);
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

  it("falls back to the first and last waypoint without ele", () => {
    const parsed: ParsedGpx = {
      ...empty,
      waypoints: [
        { lat: 1, lon: 1, ele: 5 },
        { lat: 2, lon: 2 },
        { lat: 3, lon: 3, ele: 7 },
      ],
    };
    assert.deepEqual(pathEndpoints(parsed), {
      start: { lat: 1, lon: 1 },
      end: { lat: 3, lon: 3 },
    });
  });

  it("does not use the waypoint fallback with a single waypoint", () => {
    assert.equal(
      pathEndpoints({ ...empty, waypoints: [{ lat: 1, lon: 1 }] }),
      null,
    );
  });
});

describe("safeExternalHref", () => {
  it("keeps http and https URLs", () => {
    assert.equal(
      safeExternalHref("https://example.com/route"),
      "https://example.com/route",
    );
    assert.equal(
      safeExternalHref("http://example.com/route"),
      "http://example.com/route",
    );
  });

  it("rejects script, data, and non-web schemes", () => {
    assert.equal(safeExternalHref("javascript:alert(1)"), undefined);
    assert.equal(safeExternalHref("data:text/html,hi"), undefined);
    assert.equal(safeExternalHref("mailto:ada@example.com"), undefined);
  });

  it("rejects relative and malformed values", () => {
    assert.equal(safeExternalHref("/route"), undefined);
    assert.equal(safeExternalHref("not a url"), undefined);
    assert.equal(safeExternalHref(""), undefined);
    assert.equal(safeExternalHref(undefined), undefined);
  });
});
