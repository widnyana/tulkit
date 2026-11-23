import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { DOMParser as XmldomDOMParser } from "@xmldom/xmldom";
import { isParseError, parseGpx } from "./parse.ts";

(globalThis as { DOMParser?: typeof DOMParser }).DOMParser =
  XmldomDOMParser as unknown as typeof DOMParser;

const fixture = (relativePath: string) =>
  readFileSync(
    new URL(`../../.harness/ref/gpx/${relativePath}`, import.meta.url),
    "utf8",
  );

describe("parseGpx: real-world fixtures", () => {
  it("parses a Strava track-only export (GPX 1.1)", () => {
    const result = parseGpx(fixture("audax-yogyakarta-yucc-2025-100-km.gpx"));
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.equal(result.waypoints.length, 0);
    assert.equal(result.routes.length, 0);
    assert.ok(result.tracks.length > 0);
    assert.ok(result.tracks[0].segments[0].length > 0);
    assert.ok(Number.isFinite(result.tracks[0].segments[0][0].ele));
  });

  it("parses a ViewRanger GPX 1.0 waypoint-only export with a flat <url>", () => {
    const result = parseGpx(
      fixture("Campsites/CampingMunicipal/camping-municipal-france.gpx"),
    );
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.ok(result.waypoints.length > 0);
    assert.equal(result.tracks.length, 0);
    assert.equal(result.routes.length, 0);
    assert.ok(result.waypoints.every((w) => typeof w.name === "string"));
  });

  it("parses a waypoint-only POI export (GPX 1.1)", () => {
    const result = parseGpx(
      fixture("RoscoffCoastal/poi/archies_fr.filtered.gpx"),
    );
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.ok(result.waypoints.length > 0);
    assert.equal(result.tracks.length, 0);
    assert.equal(result.routes.length, 0);
  });

  it("parses a GPSies track export with an unknown vendor extension namespace", () => {
    const result = parseGpx(fixture("BrittanyJura/JuraRoute72011.gpx"));
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.ok(result.tracks.length > 0);
    assert.ok(
      result.tracks.reduce((n, t) => n + t.segments.flat().length, 0) > 0,
    );
  });
});

describe("parseGpx: adversarial input", () => {
  it("drops a point with a NaN <ele> instead of crashing, keeping its lat/lon", () => {
    const result = parseGpx(
      '<gpx><wpt lat="12.34" lon="56.78"><ele>NaN</ele></wpt></gpx>',
    );
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.equal(result.skipped, 0);
    assert.equal(result.waypoints.length, 1);
    assert.equal(result.waypoints[0].lat, 12.34);
    assert.equal(result.waypoints[0].lon, 56.78);
  });

  it("returns a ParseError instead of throwing on malformed XML", () => {
    const result = parseGpx(
      '<gpx><trk><trkseg><trkpt lat="1" lon="2"></trkpt></gpx>',
    );
    assert.ok(isParseError(result), "expected a ParseError");
    if (!isParseError(result)) return;
    assert.equal(typeof result.message, "string");
    assert.ok(result.message.length > 0);
  });

  it("drops points missing lat or lon and counts them as skipped", () => {
    const result = parseGpx(
      '<gpx><wpt lat="1" lon="2"></wpt><wpt lon="3"></wpt><wpt lat="4"></wpt></gpx>',
    );
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.equal(result.waypoints.length, 1);
    assert.equal(result.skipped, 2);
  });
});

describe("parseGpx: track segments", () => {
  it("keeps <trkseg> boundaries when a track has several segments", () => {
    const result = parseGpx(
      '<gpx><trk><name>Ride</name><trkseg><trkpt lat="1" lon="1"></trkpt><trkpt lat="2" lon="2"></trkpt></trkseg><trkseg><trkpt lat="3" lon="3"></trkpt></trkseg></trk><trk><trkseg><trkpt lat="4" lon="4"></trkpt></trkseg></trk></gpx>',
    );
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.equal(result.tracks.length, 2);
    assert.equal(result.tracks[0].name, "Ride");
    assert.deepEqual(result.tracks[0].segments, [
      [
        { lat: 1, lon: 1 },
        { lat: 2, lon: 2 },
      ],
      [{ lat: 3, lon: 3 }],
    ]);
    assert.deepEqual(result.tracks[1].segments, [[{ lat: 4, lon: 4 }]]);
    assert.equal(result.skipped, 0);
  });

  it("drops an invalid point inside a segment without merging segments", () => {
    const result = parseGpx(
      '<gpx><trk><trkseg><trkpt lat="1" lon="1"></trkpt></trkseg><trkseg><trkpt lon="2"></trkpt><trkpt lat="3" lon="3"></trkpt></trkseg></trk></gpx>',
    );
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.equal(result.tracks[0].segments.length, 2);
    assert.deepEqual(result.tracks[0].segments[1], [{ lat: 3, lon: 3 }]);
    assert.equal(result.skipped, 1);
  });
});

describe("parseGpx: metadata", () => {
  it("reads a full GPX 1.1 metadata block", () => {
    const result = parseGpx(
      '<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">' +
        "<metadata><name>Alps loop</name><desc>A two day ride</desc>" +
        '<author><name>Ada</name><email id="ada" domain="example.com" /></author>' +
        '<link href="https://example.com/route"><text>Route page</text><type>text/html</type></link>' +
        "<time>2024-01-02T03:04:05Z</time><keywords>road, climb, alps</keywords>" +
        '<bounds minlat="45.1" minlon="5.2" maxlat="46.3" maxlon="7.4" /></metadata>' +
        '<trk><trkseg><trkpt lat="45.1" lon="5.2" /></trkseg></trk></gpx>',
    );
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.deepEqual(result.metadata, {
      name: "Alps loop",
      desc: "A two day ride",
      author: "Ada",
      email: "ada@example.com",
      link: {
        href: "https://example.com/route",
        text: "Route page",
        type: "text/html",
      },
      time: "2024-01-02T03:04:05Z",
      keywords: ["road", "climb", "alps"],
      bounds: { minLat: 45.1, minLon: 5.2, maxLat: 46.3, maxLon: 7.4 },
    });
  });

  it("reads GPX 1.0 root-level metadata fields", () => {
    const result = parseGpx(
      '<gpx version="1.0" xmlns="http://www.topografix.com/GPX/1/0">' +
        "<name>Legacy</name><desc>Old export</desc><author>Grace</author>" +
        "<email>grace@example.com</email><url>https://example.com/legacy</url>" +
        "<urlname>Legacy page</urlname><time>2010-05-06T07:08:09Z</time>" +
        "<keywords>old, gpx</keywords>" +
        '<bounds minlat="1" minlon="2" maxlat="3" maxlon="4" />' +
        '<wpt lat="1" lon="2"><name>P</name></wpt></gpx>',
    );
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.deepEqual(result.metadata, {
      name: "Legacy",
      desc: "Old export",
      author: "Grace",
      email: "grace@example.com",
      link: { href: "https://example.com/legacy", text: "Legacy page" },
      time: "2010-05-06T07:08:09Z",
      keywords: ["old", "gpx"],
      bounds: { minLat: 1, minLon: 2, maxLat: 3, maxLon: 4 },
    });
  });

  it("keeps a metadata block that only declares time and bounds", () => {
    const result = parseGpx(
      "<gpx><metadata><time>2016-04-27T15:17:02+01:00</time>" +
        '<bounds minlat="48.5" minlon="-3.9" maxlat="48.7" maxlon="-3.8" /></metadata></gpx>',
    );
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.deepEqual(result.metadata, {
      time: "2016-04-27T15:17:02+01:00",
      bounds: { minLat: 48.5, minLon: -3.9, maxLat: 48.7, maxLon: -3.8 },
    });
  });

  it("leaves metadata undefined when the file declares none", () => {
    const result = parseGpx('<gpx><wpt lat="1" lon="2" /></gpx>');
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.equal(result.metadata, undefined);
  });
});

describe("parseGpx: creator", () => {
  it("reads the root creator attribute with a metadata block", () => {
    const result = parseGpx(
      fixture("RoscoffCoastal/parcours-morlaix-plougasnou.gpx"),
    );
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.equal(result.metadata?.creator, "MapSource 6.16.3");
  });

  it("builds metadata from a bare creator attribute", () => {
    const result = parseGpx(fixture("Campsites/archies_fr.gpx"));
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.ok(result.metadata, "expected metadata for a creator attribute");
    assert.ok(result.metadata?.creator?.startsWith("PoiEdit v5.2.0"));
  });

  it("leaves metadata undefined with neither <metadata> nor creator", () => {
    const result = parseGpx(fixture("BrittanyJura/Reims-VitryLeFrancois.gpx"));
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.equal(result.metadata, undefined);
  });
});

describe("parseGpx: waypoint symbols", () => {
  it("keeps the <sym> of a point-of-interest export", () => {
    const result = parseGpx(
      '<gpx><wpt lat="1" lon="2"><name>Water Spring</name><sym>Drinking Water</sym><desc>Cold</desc></wpt></gpx>',
    );
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.equal(result.waypoints[0].name, "Water Spring");
    assert.equal(result.waypoints[0].sym, "Drinking Water");
    assert.equal(result.waypoints[0].desc, "Cold");
  });
});

describe("parseGpx: route point data", () => {
  it("keeps route point names, symbols, comments and the route desc", () => {
    const result = parseGpx(
      fixture("BrittanyJura/SimplifiedGpx/JuraRoute72011.gpx_0.gpx"),
    );
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.equal(result.routes.length, 1);
    const route = result.routes[0];
    assert.equal(route.points.length, 1249);
    assert.equal(route.points[0].name, "0.00km");
    assert.equal(
      route.points.filter((point) => point.sym === "warningflag").length,
      29,
    );
    assert.equal(typeof route.desc, "string");
    assert.ok(route.desc?.includes("Jura Route 7 / 2011"));
  });

  it("attaches links to ViewRanger campsite waypoints", () => {
    const result = parseGpx(
      fixture("Campsites/CampingMunicipal/camping-municipal-france.gpx"),
    );
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.equal(result.waypoints.length, 1649);
    assert.equal(result.skipped, 1);
    assert.ok(
      result.waypoints.every(
        (waypoint) =>
          waypoint.link === undefined ||
          waypoint.link.href?.startsWith("http") === true,
      ),
    );
    assert.equal(
      result.waypoints.filter((waypoint) => waypoint.link !== undefined).length,
      1316,
    );
  });

  it("keeps a route and its track from a single parse", () => {
    const result = parseGpx(fixture("wrong-gpx-export.gpx"));
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.equal(result.routes.length, 1);
    assert.equal(result.routes[0].points.length, 2);
    assert.equal(result.tracks.length, 1);
    assert.equal(
      result.tracks.reduce(
        (total, track) => total + track.segments.flat().length,
        0,
      ),
      1119,
    );
  });

  it("keeps route point metadata and waypoint links from attributes", () => {
    const result = parseGpx(
      '<gpx><rte><rtept lat="1" lon="2"><name>A</name><sym>Flag</sym><cmt>note</cmt></rtept></rte>' +
        '<wpt lat="3" lon="4"><link href="https://example.com/x"><text>X</text></link></wpt>' +
        '<wpt lat="5" lon="6"><url>https://example.com/legacy</url><urlname>Legacy</urlname></wpt></gpx>',
    );
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.equal(result.routes[0].points[0].name, "A");
    assert.equal(result.routes[0].points[0].sym, "Flag");
    assert.equal(result.routes[0].points[0].cmt, "note");
    assert.equal(result.waypoints[0].link?.href, "https://example.com/x");
    assert.equal(result.waypoints[0].link?.text, "X");
    assert.equal(result.waypoints[1].link?.href, "https://example.com/legacy");
    assert.equal(result.waypoints[1].link?.text, "Legacy");
  });

  it("counts an rtept with a non-numeric lat as skipped", () => {
    const result = parseGpx(
      '<gpx><rte><rtept lat="north" lon="2"><name>Bad</name></rtept>' +
        '<rtept lat="1" lon="2"><name>Good</name></rtept></rte></gpx>',
    );
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.equal(result.skipped, 1);
    assert.equal(result.routes[0].points.length, 1);
    assert.equal(result.routes[0].points[0].name, "Good");
  });
});

describe("parseGpx: structural hardening", () => {
  it("ignores an rtept nested in route extensions", () => {
    const result = parseGpx(
      '<gpx><rte><extensions><rtept lat="9" lon="9"><name>Ghost</name><sym>ghost</sym></rtept></extensions>' +
        '<rtept lat="1" lon="2"></rtept></rte></gpx>',
    );
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.equal(result.routes[0].points.length, 1);
    assert.equal(result.routes[0].points[0].name, undefined);
    assert.equal(result.routes[0].points[0].sym, undefined);
  });

  it("keeps track segment sizes when extensions nest a trkpt", () => {
    const result = parseGpx(
      '<gpx><trk><trkseg><extensions><trkpt lat="9" lon="9"></trkpt></extensions>' +
        '<trkpt lat="1" lon="1"></trkpt></trkseg><trkseg><trkpt lat="2" lon="2"></trkpt>' +
        '<extensions><trkpt lat="8" lon="8"></trkpt></extensions></trkseg></trk></gpx>',
    );
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.equal(result.tracks[0].segments.length, 2);
    assert.equal(result.tracks[0].segments[0].length, 1);
    assert.equal(result.tracks[0].segments[1].length, 1);
    assert.deepEqual(result.tracks[0].segments, [
      [{ lat: 1, lon: 1 }],
      [{ lat: 2, lon: 2 }],
    ]);
  });

  it("does not let a wpt nested in metadata extensions supply a waypoint link", () => {
    const result = parseGpx(
      '<gpx><metadata><extensions><wpt lat="9" lon="9"><link href="https://ghost.example/x">' +
        "<text>Ghost</text></link></wpt></extensions></metadata>" +
        '<wpt lat="1" lon="2"><name>Real</name></wpt></gpx>',
    );
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.equal(result.waypoints.length, 1);
    assert.equal(result.waypoints[0].name, "Real");
    assert.equal(result.waypoints[0].link, undefined);
  });

  it("falls back to a legacy url when a link element has no href", () => {
    const result = parseGpx(
      '<gpx><wpt lat="1" lon="2"><link><text>Broken</text></link>' +
        "<url>https://example.com/ok</url><urlname>OK</urlname></wpt></gpx>",
    );
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.equal(result.waypoints[0].link?.href, "https://example.com/ok");
    assert.equal(result.waypoints[0].link?.text, "OK");
  });

  it("resolves a metadata link from the root url and urlname", () => {
    const result = parseGpx(
      "<gpx><metadata><name>X</name></metadata><url>https://example.com/legacy</url>" +
        "<urlname>Legacy</urlname></gpx>",
    );
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.equal(result.metadata?.name, "X");
    assert.deepEqual(result.metadata?.link, {
      href: "https://example.com/legacy",
      text: "Legacy",
    });
  });

  it("drops bounds that are missing a corner", () => {
    const result = parseGpx(
      '<gpx><metadata><bounds minlat="1" maxlat="3" maxlon="4"/></metadata></gpx>',
    );
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.equal(result.metadata?.bounds, undefined);
  });

  it("does not take a route name from its first point", () => {
    const result = parseGpx(
      '<gpx><rte><rtept lat="1" lon="2"><name>First stop</name></rtept></rte></gpx>',
    );
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.equal(result.routes[0].name, undefined);
    assert.equal(result.routes[0].points[0].name, "First stop");
  });

  it("keeps the full text of a waypoint desc", () => {
    const result = parseGpx(
      '<gpx><wpt lat="1" lon="2"><desc>Note <b>bold</b> tail</desc></wpt></gpx>',
    );
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.equal(result.waypoints[0].desc, "Note bold tail");
  });

  it("ignores desc and sym nested in waypoint extensions", () => {
    const result = parseGpx(
      '<gpx><wpt lat="1" lon="2"><extensions><desc>vendor</desc><sym>vendor</sym>' +
        "</extensions></wpt></gpx>",
    );
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.equal(result.waypoints[0].desc, undefined);
    assert.equal(result.waypoints[0].sym, undefined);
  });

  it("falls back to root name and desc when metadata omits them", () => {
    const result = parseGpx(
      "<gpx><metadata><time>2024-01-02T03:04:05Z</time></metadata>" +
        "<name>Legacy</name><desc>Old</desc></gpx>",
    );
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.deepEqual(result.metadata, {
      name: "Legacy",
      desc: "Old",
      time: "2024-01-02T03:04:05Z",
    });
  });
});
