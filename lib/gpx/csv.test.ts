import assert from "node:assert/strict";
import { test } from "node:test";
import { parseWaypointCsv } from "./csv.ts";

const SAMPLE = `Latitude,Longitude,Name,Description
10.000000,20.000000,Start Point,Test Campus
11.000000,21.000000,Checkpoint 1,Test Pavement Connection`;

test("parses the design doc's sample CSV block", () => {
  const result = parseWaypointCsv(SAMPLE);
  assert.equal(result.errors.length, 0);
  assert.equal(result.waypoints.length, 2);
  assert.deepEqual(result.waypoints[0], {
    row: 2,
    waypoint: {
      lat: 10,
      lon: 20.000000,
      name: "Start Point",
      desc: "Test Campus",
    },
  });
  assert.deepEqual(result.waypoints[1], {
    row: 3,
    waypoint: {
      lat: 11.000000,
      lon: 21.000000,
      name: "Checkpoint 1",
      desc: "Test Pavement Connection",
    },
  });
});

test("rejects a non-numeric coordinate with a row-numbered error", () => {
  const text = `Latitude,Longitude,Name,Description
not-a-number,20.000000,Start Point,Campus`;
  const result = parseWaypointCsv(text);
  assert.equal(result.waypoints.length, 0);
  assert.deepEqual(result.errors, [
    { row: 2, message: "Row 2 has an invalid latitude" },
  ]);
});

test("rejects an out-of-range coordinate with a row-numbered error", () => {
  const text = `Latitude,Longitude,Name,Description
10.000000,200.0,Start Point,Campus`;
  const result = parseWaypointCsv(text);
  assert.equal(result.waypoints.length, 0);
  assert.deepEqual(result.errors, [
    { row: 2, message: "Row 2 has an invalid longitude" },
  ]);
});

test("rejects a short row missing columns", () => {
  const text = `Latitude,Longitude,Name,Description
10.000000`;
  const result = parseWaypointCsv(text);
  assert.equal(result.waypoints.length, 0);
  assert.deepEqual(result.errors, [
    { row: 2, message: "Row 2 has too few columns" },
  ]);
});

test("skips a blank line silently while still parsing surrounding rows and flagging bad rows elsewhere", () => {
  const text = `Latitude,Longitude,Name,Description
10.000000,20.000000,Start Point,Campus

11.000000,21.000000,Checkpoint 1,Connection
not-a-number,110.0,Bad Row,Oops`;
  const result = parseWaypointCsv(text);
  assert.equal(result.waypoints.length, 2);
  assert.deepEqual(
    result.waypoints.map((w) => w.row),
    [2, 4],
  );
  assert.deepEqual(result.errors, [
    { row: 5, message: "Row 5 has an invalid latitude" },
  ]);
});
