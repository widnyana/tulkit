import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { DOMParser as XmldomDOMParser } from "@xmldom/xmldom";
import { isParseError, parseGpx } from "../../lib/gpx/parse.ts";
import {
  allPoints,
  buildLegend,
  computeBounds,
  distanceMeters,
  elevationGain,
  flattenDesc,
  formatDistance,
  LINE_PALETTE,
  lineGroups,
  pathDistanceMeters,
  pathEndpoints,
  primaryContent,
  resolveMetadata,
  routeBrief,
  safeExternalHref,
  totalDistanceMeters,
  trackSegmentCount,
  waypointsToParsedGpx,
} from "./utils.ts";
import type { ParsedGpx } from "./types.ts";

(globalThis as { DOMParser?: typeof DOMParser }).DOMParser =
  XmldomDOMParser as unknown as typeof DOMParser;

const empty: ParsedGpx = { waypoints: [], routes: [], tracks: [], skipped: 0 };

const points = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ lat: index, lon: index }));

const parsedFixture = (relativePath: string): ParsedGpx => {
  const result = parseGpx(
    readFileSync(
      new URL(`../../.harness/ref/gpx/${relativePath}`, import.meta.url),
      "utf8",
    ),
  );
  assert.ok(!isParseError(result), `expected ${relativePath} to parse`);
  if (isParseError(result)) throw new Error(result.message);
  return result;
};

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
      // +0.6 m per step: each crossing above the 3 m threshold banks 3.6 m, so
      // 10.8 m of the 12 m ascent counts and the final 1.2 m stays under.
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

describe("resolveMetadata", () => {
  it("prefers metadata name, then route name, then track name", () => {
    const metadataName: ParsedGpx = {
      ...empty,
      metadata: { name: "Meta" },
      routes: [{ name: "Route", points: [] }],
      tracks: [{ name: "Track", segments: [] }],
    };
    assert.equal(resolveMetadata(metadataName).title, "Meta");

    const routeName: ParsedGpx = {
      ...empty,
      routes: [{ name: "Route", points: [] }],
      tracks: [{ name: "Track", segments: [] }],
    };
    assert.equal(resolveMetadata(routeName).title, "Route");

    const trackName: ParsedGpx = {
      ...empty,
      tracks: [{ name: "Track", segments: [] }],
    };
    assert.equal(resolveMetadata(trackName).title, "Track");
  });

  it("omits the title for creator-only metadata", () => {
    const resolved = resolveMetadata({
      ...empty,
      metadata: { creator: "MapSource 6.16.3" },
    });
    assert.equal(resolved.title, undefined);
    assert.equal(resolved.creator, "MapSource 6.16.3");
  });

  it("prefers metadata bounds and falls back to computed point bounds", () => {
    const bounds = { minLat: 1, minLon: 2, maxLat: 3, maxLon: 4 };
    const declared = resolveMetadata({
      ...empty,
      metadata: { bounds },
      waypoints: [{ lat: -10, lon: -20 }],
    });
    assert.deepEqual(declared.bounds, bounds);

    const computed = resolveMetadata({
      ...empty,
      waypoints: [{ lat: 10, lon: 20 }],
      routes: [{ points: [{ lat: 0, lon: 0 }] }],
      tracks: [{ segments: [[{ lat: -5, lon: 5 }]] }],
    });
    assert.deepEqual(computed.bounds, {
      minLat: -5,
      minLon: 0,
      maxLat: 10,
      maxLon: 20,
    });
  });

  it("counts waypoints, route points, and track points", () => {
    const resolved = resolveMetadata({
      waypoints: [{ lat: 1, lon: 1 }],
      routes: [
        {
          points: [
            { lat: 2, lon: 2 },
            { lat: 3, lon: 3 },
          ],
        },
      ],
      tracks: [{ segments: [[{ lat: 4, lon: 4 }], [{ lat: 5, lon: 5 }]] }],
      skipped: 0,
    });
    assert.deepEqual(resolved.pointCounts, {
      waypoints: 1,
      routePoints: 2,
      trackPoints: 2,
    });
    assert.equal(resolveMetadata(empty).pointCounts, undefined);
  });

  it("passes link and keywords through unchanged", () => {
    const link = { href: "https://example.com", text: "Page" };
    const keywords = ["a", "b"];
    const resolved = resolveMetadata({
      ...empty,
      metadata: { link, keywords },
    });
    assert.equal(resolved.link, link);
    assert.equal(resolved.keywords, keywords);
  });
});

describe("flattenDesc", () => {
  it("flattens inline HTML into plain lines", () => {
    const text = flattenDesc(
      "<h2>Header</h2>\n<p>Line &amp; more</p>\n<ul><li>One</li><li>Two</li></ul><p>x<br/>y</p>",
    );
    assert.equal(text, "Header\nLine & more\nOne\nTwo\nx\ny");
    assert.ok(!text.includes("<"));
    assert.ok(!text.includes(">"));
  });

  it("decodes named and numeric entities", () => {
    assert.equal(
      flattenDesc("<p>&quot;A&apos;s&#39; &lt;b&gt; &nbsp; &#65;&#x42;</p>"),
      "\"A's' AB",
    );
  });

  it("collapses whitespace and drops empty lines", () => {
    assert.equal(flattenDesc("  a   b \n\n  c  "), "a b\nc");
  });

  it("returns an empty string for missing or blank input", () => {
    assert.equal(flattenDesc(undefined), "");
    assert.equal(flattenDesc("   "), "");
  });
});

describe("primaryContent / routeBrief", () => {
  it("picks the content with the most points", () => {
    const parsed: ParsedGpx = {
      ...empty,
      routes: [{ points: points(3) }],
      tracks: [{ segments: [points(2)] }],
    };
    const primary = primaryContent(parsed);
    assert.equal(primary?.kind, "route");
    assert.equal(primary?.pointCount, 3);
  });

  it("prefers the track when point counts tie", () => {
    const parsed: ParsedGpx = {
      ...empty,
      routes: [{ points: points(3) }],
      tracks: [{ segments: [points(1), points(2)] }],
    };
    const primary = primaryContent(parsed);
    assert.equal(primary?.kind, "track");
    assert.equal(primary?.pointCount, 3);
  });

  it("returns the route desc when the route is primary", () => {
    const parsed: ParsedGpx = {
      ...empty,
      routes: [{ desc: "route desc", points: points(3) }],
      tracks: [{ desc: "track desc", segments: [points(1)] }],
    };
    assert.equal(routeBrief(parsed), "route desc");
  });

  it("falls back to the route desc when the primary track has none", () => {
    const parsed: ParsedGpx = {
      ...empty,
      routes: [{ desc: "route desc", points: points(1) }],
      tracks: [{ segments: [points(3)] }],
    };
    assert.equal(routeBrief(parsed), "route desc");
  });

  it("falls back to the track desc when the primary route has none", () => {
    const parsed: ParsedGpx = {
      ...empty,
      routes: [{ points: points(3) }],
      tracks: [{ desc: "track desc", segments: [points(1)] }],
    };
    assert.equal(routeBrief(parsed), "track desc");
  });

  it("ignores metadata.desc", () => {
    const parsed: ParsedGpx = {
      ...empty,
      metadata: { desc: "file desc" },
      routes: [{ points: points(2) }],
      tracks: [{ segments: [points(1)] }],
    };
    assert.equal(routeBrief(parsed), undefined);
  });

  it("returns null and undefined with no route or track", () => {
    assert.equal(primaryContent(empty), null);
    assert.equal(routeBrief(empty), undefined);
  });
});

describe("routeBrief: corpus", () => {
  it("flattens a track description", () => {
    const brief = routeBrief(
      parsedFixture("BrittanyJura/Southampton_Portsmouth.gpx"),
    );
    assert.ok(brief);
    assert.equal(flattenDesc(brief), "39.5 km, 2:15");
  });

  it("flattens CDATA HTML from a route description", () => {
    const brief = routeBrief(
      parsedFixture("BrittanyJura/SimplifiedGpx/JuraRoute72011.gpx_0.gpx"),
    );
    assert.ok(brief);
    const flat = flattenDesc(brief);
    assert.ok(flat.includes("Jura Route 7 / 2011"));
    assert.ok(!flat.includes("<h2>"));
    assert.ok(!flat.includes("<a href"));
  });

  it("returns undefined for waypoint-only exports", () => {
    assert.equal(
      routeBrief(
        parsedFixture(
          "Campsites/CampingMunicipal/camping-municipal-france.gpx",
        ),
      ),
      undefined,
    );
  });
});

describe("buildLegend", () => {
  it("returns an empty model without throwing", () => {
    assert.deepEqual(buildLegend(empty), {
      lines: [],
      marks: null,
      namedPoints: null,
      poiGroups: [],
      endpoints: null,
      loop: false,
    });
  });

  it("detects a step from flagged km markers", () => {
    const parsed: ParsedGpx = {
      ...empty,
      routes: [
        {
          points: Array.from({ length: 40 }, (_, index) => ({
            lat: index,
            lon: index,
            ...(index % 10 === 0
              ? { name: `${index.toFixed(2)}km`, sym: "flag" }
              : {}),
          })),
        },
      ],
    };
    const marks = buildLegend(parsed).marks;
    assert.equal(marks?.count, 4);
    assert.equal(marks?.stepKm, 10);
    assert.deepEqual(marks?.labels, [
      "0.00km",
      "10.00km",
      "20.00km",
      "30.00km",
    ]);
  });

  it("falls back to named points when no km names exist", () => {
    const parsed: ParsedGpx = {
      ...empty,
      routes: [
        {
          points: [
            { lat: 0, lon: 0, name: "A" },
            { lat: 1, lon: 1, name: "B", sym: "camp" },
            { lat: 2, lon: 2, name: "C" },
          ],
        },
      ],
    };
    const legend = buildLegend(parsed);
    assert.equal(legend.marks, null);
    assert.equal(legend.namedPoints?.label, "A");
    assert.equal(legend.namedPoints?.count, 3);
  });

  it("groups waypoints by symbol with distinct stable colours", () => {
    const parsed: ParsedGpx = {
      ...empty,
      waypoints: [
        { lat: 0, lon: 0, sym: "Water" },
        { lat: 1, lon: 1, sym: "Camp" },
        { lat: 2, lon: 2 },
      ],
    };
    const groups = buildLegend(parsed).poiGroups;
    assert.equal(groups.length, 3);
    assert.deepEqual(groups.map((group) => group.label).sort(), [
      "Camp",
      "Points",
      "Water",
    ]);
    assert.equal(
      groups.reduce((total, group) => total + group.count, 0),
      3,
    );
    assert.equal(new Set(groups.map((group) => group.color)).size, 3);
    assert.deepEqual(buildLegend(parsed).poiGroups, groups);
  });

  it("merges groups beyond the limit into Other", () => {
    const syms = [
      "alpha",
      "bravo",
      "charlie",
      "delta",
      "echo",
      "foxtrot",
      "golf",
      "hotel",
    ];
    const parsed: ParsedGpx = {
      ...empty,
      waypoints: syms.map((sym, index) => ({
        lat: index,
        lon: index,
        sym,
      })),
    };
    const groups = buildLegend(parsed).poiGroups;
    assert.equal(groups.length, 7);
    assert.equal(groups.filter((group) => group.key !== "other").length, 6);
    const other = groups.find((group) => group.key === "other");
    assert.equal(other?.label, "Other");
    assert.equal(other?.count, 2);
  });

  it("reads the Jura corpus km step", () => {
    const legend = buildLegend(
      parsedFixture("BrittanyJura/SimplifiedGpx/JuraRoute72011.gpx_0.gpx"),
    );
    assert.equal(legend.marks?.count, 29);
    assert.equal(legend.marks?.stepKm, 10);
    assert.equal(legend.poiGroups.length, 0);
    assert.ok(legend.lines.length > 0);
  });

  it("groups the campsite corpus", () => {
    const legend = buildLegend(
      parsedFixture("Campsites/CampingMunicipal/camping-municipal-france.gpx"),
    );
    assert.equal(legend.poiGroups.length, 1);
    assert.equal(legend.poiGroups[0].label, "Camp");
    assert.equal(legend.poiGroups[0].count, 1649);
  });

  it("leaves the Roscoff POI export without marks", () => {
    const parsed = parsedFixture("RoscoffCoastal/poi/archies_fr.filtered.gpx");
    assert.equal(parsed.waypoints.length, 62);
    assert.equal(buildLegend(parsed).marks, null);
  });

  it("leaves the audax track without marks or POI groups", () => {
    const legend = buildLegend(
      parsedFixture("audax-yogyakarta-yucc-2025-100-km.gpx"),
    );
    assert.equal(legend.marks, null);
    assert.equal(legend.poiGroups.length, 0);
    assert.ok(legend.lines.length > 0);
  });
});
