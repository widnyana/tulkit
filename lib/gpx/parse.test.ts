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

describe("parseGpx — real-world fixtures", () => {
  it("parses a Strava track-only export (GPX 1.1)", () => {
    const result = parseGpx(fixture("audax-yogyakarta-yucc-2025-100-km.gpx"));
    assert.ok(!isParseError(result), "expected a successful parse");
    if (isParseError(result)) return;
    assert.equal(result.waypoints.length, 0);
    assert.equal(result.routes.length, 0);
    assert.ok(result.tracks.length > 0);
    assert.ok(result.tracks[0].segments[0].length > 0);
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

describe("parseGpx — adversarial input", () => {
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
