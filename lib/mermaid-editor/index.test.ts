import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAny, serialize } from "./index.ts";
import type { FlowModel, SeqModel } from "./types.ts";

test("parseAny dispatches flowchart", () => {
  const result = parseAny("graph TD\nA[Hi] --> B(There)");
  assert.ok(result.ok);
  assert.equal(result.model.kind, "flowchart");
  const flow = result.model as FlowModel;
  assert.equal(flow.dir, "TD");
  assert.deepEqual(
    flow.nodes.map((node) => node.id),
    ["A", "B"],
  );
});

test("parseAny dispatches sequence", () => {
  const result = parseAny("sequenceDiagram\nA->>B: hi");
  assert.ok(result.ok);
  assert.equal(result.model.kind, "sequence");
  const seq = result.model as SeqModel;
  assert.deepEqual(
    seq.parties.map((party) => party.id),
    ["A", "B"],
  );
});

test("parseAny: gantt gives a reason naming Gantt", () => {
  const result = parseAny("gantt\n    title Plan\n    section Work\n");
  assert.ok(!result.ok);
  assert.match(result.reason, /\bGantt\b/);
});

test("parseAny: front matter gives the Text-only reason", () => {
  const result = parseAny("---\ntitle: x\n---\nflowchart TD\nA-->B");
  assert.ok(!result.ok);
  assert.match(result.reason, /Text-only/);
});

test("parseAny: comment-only text gives an empty flowchart model", () => {
  const result = parseAny("%% just a comment\n\n%% another");
  assert.ok(result.ok);
  assert.deepEqual(result.model, {
    kind: "flowchart",
    dir: "TD",
    nodes: [],
    edges: [],
    pos: {},
    groups: [],
    classDefs: [],
    classes: [],
    styles: [],
  });
});

test("serialize dispatches by model kind", () => {
  const flow: FlowModel = {
    kind: "flowchart",
    dir: "LR",
    nodes: [{ id: "A", label: "Hi", shape: "rect" }],
    edges: [],
    pos: {},
    groups: [],
    classDefs: [],
    classes: [],
    styles: [],
  };
  assert.equal(serialize(flow), "flowchart LR\n    A[Hi]");
  const seq: SeqModel = {
    kind: "sequence",
    parties: [{ id: "A", label: "Alice", actor: false }],
    messages: [{ from: "A", to: "A", arrow: "->>", text: "self" }],
  };
  assert.equal(
    serialize(seq),
    "sequenceDiagram\n    participant A as Alice\n    A ->> A: self",
  );
});
