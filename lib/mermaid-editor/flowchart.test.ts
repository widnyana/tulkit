import assert from "node:assert/strict";
import { test } from "node:test";
import { parseFlowchart, serializeFlowchart } from "./flowchart.ts";
import type { FlowModel } from "./types.ts";

const SAMPLE = `graph TD
    A[Start] --> B{Is it?}
    B -->|Yes| C[OK]
    B -->|No| D[End]`;

function parseOk(code: string): FlowModel {
  const result = parseFlowchart(code);
  assert.equal(result.ok, true, `expected ok, got ${JSON.stringify(result)}`);
  return (result as { model: FlowModel }).model;
}

function parseFail(code: string): { reason: string; line: number } {
  const result = parseFlowchart(code);
  assert.equal(result.ok, false, "expected ok:false");
  return result as { ok: false; reason: string; line: number };
}

function roundTrip(model: FlowModel): FlowModel {
  return parseOk(serializeFlowchart(model));
}

test("SAMPLE parses to 4 nodes, 3 edges, B diamond, labels Yes/No", () => {
  const model = parseOk(SAMPLE);
  assert.equal(model.kind, "flowchart");
  assert.equal(model.dir, "TD");
  assert.equal(model.nodes.length, 4);
  assert.equal(model.edges.length, 3);
  const b = model.nodes.find((node) => node.id === "B");
  assert.deepEqual(
    { id: b?.id, shape: b?.shape },
    { id: "B", shape: "diamond" },
  );
  assert.equal(model.edges[1].label, "Yes");
  assert.equal(model.edges[2].label, "No");
});

test("every shape and every edge style survives parse -> serialize -> parse", () => {
  const model: FlowModel = {
    kind: "flowchart",
    dir: "LR",
    nodes: [
      { id: "a", label: "rect", shape: "rect" },
      { id: "b", label: "round", shape: "round" },
      { id: "c", label: "diamond", shape: "diamond" },
      { id: "d", label: "circle", shape: "circle" },
      { id: "e", label: "stadium", shape: "stadium" },
    ],
    edges: [
      { from: "a", to: "b", label: null, style: "solid" },
      { from: "b", to: "c", label: null, style: "dotted" },
      { from: "c", to: "d", label: null, style: "thick" },
    ],
    pos: {},
  };
  const parsed = roundTrip(model);
  assert.deepEqual(parsed, model);
});

test("serialize is idempotent on its own output", () => {
  const once = serializeFlowchart(parseOk(SAMPLE));
  const twice = serializeFlowchart(parseOk(once));
  assert.equal(twice, once);
});

test("chain A --> B --> C yields two edges", () => {
  const model = parseOk("graph TD\n    A --> B --> C");
  assert.equal(model.edges.length, 2);
  assert.deepEqual(
    model.edges.map((edge) => [edge.from, edge.to]),
    [
      ["A", "B"],
      ["B", "C"],
    ],
  );
});

test("redefinition overwrites label, bare reference keeps it", () => {
  const model = parseOk("graph TD\n    A[One]\n    A[Two]\n    A");
  const a = model.nodes.find((node) => node.id === "A");
  assert.equal(a?.label, "Two");
  assert.equal(model.nodes.length, 1);
});

test("quoted label with brackets and double quote round-trips via #quot;", () => {
  const label = 'Weird [x] "quoted"';
  const model: FlowModel = {
    kind: "flowchart",
    dir: "TD",
    nodes: [{ id: "a", label, shape: "rect" }],
    edges: [],
    pos: {},
  };
  const parsed = roundTrip(model);
  assert.deepEqual(parsed, model);
  assert.ok(serializeFlowchart(model).includes("#quot;"));
});

test("edge label with pipe round-trips via #124;", () => {
  const model: FlowModel = {
    kind: "flowchart",
    dir: "TD",
    nodes: [
      { id: "a", label: "", shape: "rect" },
      { id: "b", label: "", shape: "rect" },
    ],
    edges: [{ from: "a", to: "b", label: "yes | no", style: "solid" }],
    pos: {},
  };
  const parsed = roundTrip(model);
  assert.deepEqual(parsed, model);
});

test("layout line before node lines applies; bad entries are dropped", () => {
  const code = [
    "graph TD",
    '%% tulkit-layout {"a":[10,20],"ghost":[1,2],"bad":[1,"x"],"nan":[1.5,NaN]}',
    "    a[Alpha] --> b",
  ].join("\n");
  const model = parseOk(code);
  assert.deepEqual(model.pos, { a: [10, 20] });

  const modelInvalid = parseOk("graph TD\n%% tulkit-layout {not json}");
  assert.deepEqual(modelInvalid.pos, {});
});

test("unsupported lines fail with the right 1-based line number", () => {
  const cases: Array<[string, string, number]> = [
    ["subgraph X", "subgraph X", 1],
    ["classDef", "classDef a fill:#f00", 3],
    ["style", "style A fill:#f00", 3],
    ["click", "click A cb", 3],
    ["edge with text", "A -- text --> B", 3],
    ["comment", "%% note", 3],
  ];
  for (const [, body, expectedLine] of cases) {
    const code =
      body === "subgraph X" ? body : `graph TD\n    A --> B\n${body}`;
    const result = parseFail(code);
    assert.equal(result.line, expectedLine, `case ${body}`);
    assert.ok(result.reason.length > 0);
  }
});

test("second header line fails; end as an id fails", () => {
  const secondHeader = parseFail("graph TD\n    A --> B\nflowchart LR");
  assert.equal(secondHeader.line, 3);
  const endId = parseFail("graph TD\n    end --> A");
  assert.equal(endId.line, 2);
});

test("empty model serializes to flowchart TD only", () => {
  const model: FlowModel = {
    kind: "flowchart",
    dir: "TD",
    nodes: [],
    edges: [],
    pos: {},
  };
  assert.equal(serializeFlowchart(model), "flowchart TD");
});
