import assert from "node:assert/strict";
import { test } from "node:test";
import { isShortMapsLink, parseMapsUrl } from "./mapsLink.ts";

const REAL_DIRECTIONS_URL =
  "https://www.google.com/maps/dir/Test+Stop+One/Test+Stop+Two/@1.0,2.0,35486m/data=!3m2!1e3!4b1!4m17!1m2!29m1!3s00000000-0000-0000-0000-000000000000!4m13!1m5!1m1!1s0x0:0x0!2m2!1d20.5!2d10.5!1m5!1m1!1s0x0:0x0!2m2!1d30.25!2d15.75!3e0?entry=ttu&g_ep=0000000000";

test("parseMapsUrl extracts both stops from a real directions link", () => {
  const result = parseMapsUrl(REAL_DIRECTIONS_URL);
  assert.ok(Array.isArray(result), "expected an array of waypoints");
  if (!Array.isArray(result)) return;

  assert.equal(result.length, 2);

  assert.equal(result[0].lon, 20.5);
  assert.equal(result[0].lat, 10.5);
  assert.ok(result[0].name?.includes("Test Point"));

  assert.equal(result[1].lon, 30.25);
  assert.equal(result[1].lat, 15.75);
  assert.ok(result[1].name?.includes("Test Stop"));
});

test("parseMapsUrl extracts a single stop from a place link", () => {
  const result = parseMapsUrl(
    "https://www.google.com/maps/place/Test+Landmark/@12.5,25.5,17z",
  );
  assert.ok(Array.isArray(result));
  if (!Array.isArray(result)) return;

  assert.equal(result.length, 1);
  assert.equal(result[0].lat, 12.5);
  assert.equal(result[0].lon, 25.5);
  assert.equal(result[0].name, "Test Landmark");
});

test("parseMapsUrl returns an explicit error for an unsupported shape", () => {
  const result = parseMapsUrl(
    "https://www.google.com/maps/search/coffee+near+me",
  );
  assert.ok(!Array.isArray(result));
  if (Array.isArray(result)) return;

  assert.equal(typeof result.message, "string");
  assert.ok(result.message.length > 0);
});

test("isShortMapsLink recognizes short link hosts", () => {
  assert.equal(isShortMapsLink("https://maps.app.goo.gl/abc123"), true);
  assert.equal(isShortMapsLink("https://goo.gl/maps/xyz"), true);
  assert.equal(isShortMapsLink(REAL_DIRECTIONS_URL), false);
  assert.equal(isShortMapsLink("not a url"), false);
});
