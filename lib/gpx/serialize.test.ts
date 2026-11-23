import assert from "node:assert/strict";
import { test } from "node:test";
import { DOMParser as XmldomDOMParser } from "@xmldom/xmldom";
import { isParseError, parseGpx } from "./parse.ts";
import { waypointsToGpx } from "./serialize.ts";

(globalThis as { DOMParser?: typeof DOMParser }).DOMParser =
  XmldomDOMParser as unknown as typeof DOMParser;

test("waypointsToGpx round-trips through parseGpx", () => {
  const points = [
    { lat: 10.5, lon: 20.5, name: "Test Point" },
    {
      lat: 15.75,
      lon: 30.25,
      name: "Soto & Kudus",
      desc: "Mas <Kliwon>",
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
