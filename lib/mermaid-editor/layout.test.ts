import { test } from "node:test";
import assert from "node:assert/strict";
import { autoPlace, clipToBox, nextNodeId } from "./layout.ts";
import type { FlowModel } from "./types.ts";

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

function makeModel(
  dir: FlowModel["dir"],
  nodes: string[],
  edges: [string, string][],
): FlowModel {
  return {
    kind: "flowchart",
    dir,
    nodes: nodes.map((id) => ({ id, label: id, shape: "rect" })),
    edges: edges.map(([from, to]) => ({
      from,
      to,
      label: null,
      style: "solid",
    })),
    pos: {},
  };
}

test("autoPlace on a TD chain gives increasing y", () => {
  const model = makeModel(
    "TD",
    ["A", "B", "C"],
    [
      ["A", "B"],
      ["B", "C"],
    ],
  );
  const placed = autoPlace(model);
  const [a, b, c] = ["A", "B", "C"].map((id) => placed.pos[id]);
  assert.ok(a[1] < b[1]);
  assert.ok(b[1] < c[1]);
});

test("autoPlace on an LR chain gives increasing x", () => {
  const model = makeModel(
    "LR",
    ["A", "B", "C"],
    [
      ["A", "B"],
      ["B", "C"],
    ],
  );
  const placed = autoPlace(model);
  const [a, b, c] = ["A", "B", "C"].map((id) => placed.pos[id]);
  assert.ok(a[0] < b[0]);
  assert.ok(b[0] < c[0]);
});

test("autoPlace handles a cycle and terminates, placing both nodes", () => {
  const model = makeModel(
    "TD",
    ["A", "B"],
    [
      ["A", "B"],
      ["B", "A"],
    ],
  );
  const placed = autoPlace(model);
  assert.ok("A" in placed.pos);
  assert.ok("B" in placed.pos);
});

test("autoPlace does not move existing positions", () => {
  const model = makeModel("TD", ["A", "B"], [["A", "B"]]);
  model.pos = { A: [500, 500] };
  const placed = autoPlace(model);
  assert.deepEqual(placed.pos.A, [500, 500]);
  assert.ok(!("B" in model.pos));
  assert.ok("B" in placed.pos);
});

test("autoPlace never places two nodes at the same point", () => {
  const model = makeModel(
    "TD",
    ["A", "B", "C", "D"],
    [
      ["A", "B"],
      ["A", "C"],
      ["A", "D"],
    ],
  );
  model.pos = { D: [40, 40] };
  const placed = autoPlace(model);
  const points = Object.values(placed.pos).map(([x, y]) => `${x},${y}`);
  assert.equal(new Set(points).size, points.length);
});

test("clipToBox clips a horizontal segment to the border", () => {
  const end = clipToBox({ x: 0, y: 100 }, { x: 400, y: 100 }, 50, 30);
  assert.equal(end.x, 350);
  assert.equal(end.y, 100);
});

test("clipToBox clips a vertical segment to the border", () => {
  const end = clipToBox({ x: 400, y: 0 }, { x: 400, y: 300 }, 50, 30);
  assert.equal(end.x, 400);
  assert.equal(end.y, 270);
});

test("clipToBox clips a diagonal segment to the nearest border axis", () => {
  const end = clipToBox({ x: 0, y: 0 }, { x: 400, y: 300 }, 50, 30);
  assert.equal(end.x, 360);
  assert.equal(end.y, 270);
});

test("clipToBox returns the center for a zero-length vector", () => {
  const end = clipToBox({ x: 10, y: 20 }, { x: 10, y: 20 }, 50, 30);
  assert.deepEqual(end, { x: 10, y: 20 });
});
