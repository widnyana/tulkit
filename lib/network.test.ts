import assert from "node:assert/strict";
import test from "node:test";
import { profileFromConnection } from "./network.ts";

test("treats a missing connection API as fast", () => {
  assert.deepEqual(profileFromConnection(undefined), {
    effectiveType: "unknown",
    saveData: false,
    slow: false,
  });
});

test("marks saveData as slow even on a fast link", () => {
  const profile = profileFromConnection({
    effectiveType: "4g",
    saveData: true,
  });
  assert.equal(profile.slow, true);
});

test("marks constrained effective types as slow", () => {
  for (const effectiveType of ["slow-2g", "2g", "3g"]) {
    assert.equal(
      profileFromConnection({ effectiveType }).slow,
      true,
      effectiveType,
    );
  }
});

test("keeps 4g and unknown types fast without saveData", () => {
  assert.equal(profileFromConnection({ effectiveType: "4g" }).slow, false);
  assert.equal(profileFromConnection({}).slow, false);
});

test("does not treat an unrecognised effective type as slow", () => {
  assert.equal(profileFromConnection({ effectiveType: "5g" }).slow, false);
});
