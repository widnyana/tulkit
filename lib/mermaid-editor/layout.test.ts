import assert from "node:assert/strict";
import { test } from "node:test";
import { nextNodeId } from "./layout.ts";

test("nextNodeId returns A on empty input", () => {
  assert.equal(nextNodeId([]), "A");
});

test("nextNodeId returns C when A and B are used", () => {
  assert.equal(nextNodeId(["A", "B"]), "C");
});

test("nextNodeId returns N1 when A..Z are used", () => {
  const used = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  assert.equal(nextNodeId(used), "N1");
});

test("nextNodeId never returns end", () => {
  const used = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  assert.notEqual(nextNodeId(used), "end");
  assert.notEqual(nextNodeId(["end"]), "end");
});
