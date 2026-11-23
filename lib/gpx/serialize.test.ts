import assert from "node:assert/strict";
import { test } from "node:test";
import { DOMParser as XmldomDOMParser } from "@xmldom/xmldom";
import { isParseError, parseGpx } from "./parse.ts";
import { routeToGpx, waypointsToGpx } from "./serialize.ts";

(globalThis as { DOMParser?: typeof DOMParser }).DOMParser =
  XmldomDOMParser as unknown as typeof DOMParser;

test("waypointsToGpx round-trips through parseGpx", () => {
  const points = [
    { lat: 10.5, lon: 20.5, name: "Test Point" },
    {
      lat: 15.75,
      lon: 30.25,
      name: "Test & Co",
      desc: "A <Place>",
    },
  ];

  const gpx = waypointsToGpx(points);
  const parsed = parseGpx(gpx);

  assert.ok(!isParseError(parsed));
  if (isParseError(parsed)) return;

  assert.equal(parsed.waypoints.length, points.length);
  for (let i = 0; i < points.length; i++) {
    assert.equal(parsed.waypoints[i].lat, points[i].lat);
    assert.equal(parsed.waypoints[i].lon, points[i].lon);
    assert.equal(parsed.waypoints[i].name, points[i].name);
    assert.equal(parsed.waypoints[i].desc, points[i].desc);
  }
});

test("waypointsToGpx escapes XML special characters", () => {
  const gpx = waypointsToGpx([{ lat: 0, lon: 0, name: "A & B < C > D" }]);
  assert.ok(gpx.includes("A &amp; B &lt; C &gt; D"));
  assert.ok(!gpx.includes("A & B < C > D"));
});

test("routeToGpx round-trips control points through parseGpx", () => {
  const controlPoints = [
    { lat: 10.5, lon: 20.5, name: "Start" },
    { lat: 11.25, lon: 21.75, name: "Middle" },
    { lat: 12.125, lon: 22.875, name: "End" },
  ];

  const gpx = routeToGpx({ name: "Morning Loop", controlPoints });
  const parsed = parseGpx(gpx);

  assert.ok(!isParseError(parsed));
  if (isParseError(parsed)) return;

  assert.equal(parsed.waypoints.length, 0);
  assert.equal(parsed.tracks.length, 0);
  assert.equal(parsed.routes.length, 1);

  const route = parsed.routes[0];
  assert.equal(route.name, "Morning Loop");
  assert.equal(route.points.length, controlPoints.length);
  for (let i = 0; i < controlPoints.length; i++) {
    assert.equal(route.points[i].lat, controlPoints[i].lat);
    assert.equal(route.points[i].lon, controlPoints[i].lon);
  }
});

test("routeToGpx writes a snapped path as a single track segment", () => {
  const controlPoints = [
    { lat: 40.1, lon: -73.9 },
    { lat: 40.2, lon: -73.8 },
  ];
  const snappedPath = [
    { lat: 40.1, lon: -73.9 },
    { lat: 40.15, lon: -73.855 },
    { lat: 40.17, lon: -73.83 },
    { lat: 40.2, lon: -73.8 },
  ];

  const gpx = routeToGpx({ name: "Snapped", controlPoints, snappedPath });
  const parsed = parseGpx(gpx);

  assert.ok(!isParseError(parsed));
  if (isParseError(parsed)) return;

  assert.equal(parsed.routes.length, 1);
  assert.equal(parsed.routes[0].points.length, controlPoints.length);
  for (let i = 0; i < controlPoints.length; i++) {
    assert.equal(parsed.routes[0].points[i].lat, controlPoints[i].lat);
    assert.equal(parsed.routes[0].points[i].lon, controlPoints[i].lon);
  }

  assert.equal(parsed.tracks.length, 1);
  assert.equal(parsed.tracks[0].segments.length, 1);
  const segment = parsed.tracks[0].segments[0];
  assert.equal(segment.length, snappedPath.length);
  for (let i = 0; i < snappedPath.length; i++) {
    assert.equal(segment[i].lat, snappedPath[i].lat);
    assert.equal(segment[i].lon, snappedPath[i].lon);
  }
});

test("routeToGpx escapes XML special characters in the route name", () => {
  const name = "A & B < C > D";
  const gpx = routeToGpx({ name, controlPoints: [{ lat: 0, lon: 0 }] });

  assert.ok(gpx.includes("A &amp; B &lt; C &gt; D"));
  assert.ok(!gpx.includes("A & B < C > D"));

  const parsed = parseGpx(gpx);
  assert.ok(!isParseError(parsed));
  if (isParseError(parsed)) return;

  assert.equal(parsed.routes.length, 1);
  assert.equal(parsed.routes[0].name, name);
});
