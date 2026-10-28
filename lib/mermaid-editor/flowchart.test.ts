import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseFlowchart, removeNode, serializeFlowchart } from "./flowchart.ts";
import type { FlowModel } from "./types.ts";

const SAMPLE = `graph TD
    A[Start] --> B{Is it?}
    B -->|Yes| C[OK]
    B -->|No| D[End]`;

const FIXTURE = readFileSync(
  new URL("./fixtures/architecture.mmd", import.meta.url),
  "utf8",
);

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

    groups: [],
    classDefs: [],
    classes: [],
    styles: [],
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

    groups: [],
    classDefs: [],
    classes: [],
    styles: [],
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

    groups: [],
    classDefs: [],
    classes: [],
    styles: [],
  };
  const parsed = roundTrip(model);
  assert.deepEqual(parsed, model);
});

test("layout line is accepted and ignored", () => {
  const code = [
    "graph TD",
    '%% tulkit-layout {"a":[10,20]}',
    "    a[Alpha] --> b",
  ].join("\n");
  const parsed = parseFlowchart(code);
  assert.ok(parsed.ok);
  assert.ok(
    parsed.model.kind === "flowchart" &&
      !serializeFlowchart(parsed.model).includes("tulkit-layout"),
  );

  const modelInvalid = parseOk("graph TD\n%% tulkit-layout {not json}");
  assert.ok(!serializeFlowchart(modelInvalid).includes("tulkit-layout"));
});

test("unsupported lines fail with the right 1-based line number", () => {
  const cases: Array<[string, string, number]> = [
    ["subgraph X", "subgraph X", 1],
    ["shorthand class", "A:::c", 3],
    ["linkStyle", "linkStyle 0 stroke:#f00", 3],
    ["click", "click A cb", 3],
    ["bad arrow", "A -- text -> B", 3],
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

    groups: [],
    classDefs: [],
    classes: [],
    styles: [],
  };
  assert.equal(serializeFlowchart(model), "flowchart TD");
});

const FIXTURE_MODEL = parseOk(FIXTURE);

test("fixture parses with 6 groups, 23 nodes, extra shapes, fan-out and labels", () => {
  const model = FIXTURE_MODEL;
  assert.equal(model.nodes.length, 23);
  assert.deepEqual(
    model.groups.map((group) => [group.id, group.title, group.dir]),
    [
      ["Client", "Client Tier", "TB"],
      ["Edge", "Edge", null],
      ["Gateway", "API Gateway", "TB"],
      ["Services", "Services", "TB"],
      ["Data", "Data Tier", "TB"],
      ["Async", "Async", "TB"],
    ],
  );
  const pgp = model.nodes.find((node) => node.id === "PGP");
  const bus = model.nodes.find((node) => node.id === "Bus");
  assert.equal(pgp?.shape, "cylinder");
  assert.equal(pgp?.label, "Postgres Primary");
  assert.equal(bus?.shape, "hexagon");
  assert.equal(bus?.label, "Event Bus");
  const routerEdges = model.edges.filter((edge) => edge.from === "Router");
  assert.deepEqual(
    routerEdges.map((edge) => edge.to),
    ["Users", "Orders", "Pay", "Search"],
  );
  const authYes = model.edges.find(
    (edge) => edge.from === "Auth" && edge.to === "RL",
  );
  assert.equal(authYes?.label, "yes");
  const ordersReads = model.edges.find(
    (edge) => edge.from === "Orders" && edge.to === "PGR",
  );
  assert.equal(ordersReads?.style, "dotted");
  assert.equal(ordersReads?.label, "reads");
  const replication = model.edges.find(
    (edge) => edge.from === "PGP" && edge.to === "PGR",
  );
  assert.equal(replication?.style, "thick");
  assert.equal(replication?.label, "replication");
  assert.equal(model.classDefs.length, 2);
  assert.deepEqual(
    model.classes.find((entry) => entry.name === "bad"),
    { ids: ["Reject", "DLQ"], name: "bad" },
  );
  const rejectGroup = model.groups.filter((group) =>
    group.members.includes("Reject"),
  );
  assert.deepEqual(rejectGroup, []);
});

test("fixture serialize is idempotent and re-parses to the same model", () => {
  const once = serializeFlowchart(FIXTURE_MODEL);
  const reparsed = parseOk(once);
  assert.deepEqual(reparsed, FIXTURE_MODEL);
  const twice = serializeFlowchart(reparsed);
  assert.equal(twice, once);
});

test("nested subgraph, stray end, and linkStyle fail closed", () => {
  const nested = parseFail(
    "flowchart LR\n    subgraph A\n        subgraph B\n    end\n    end",
  );
  assert.equal(nested.line, 3);
  assert.equal(
    nested.reason,
    "Nested subgraphs are not supported in Visual mode yet",
  );
  const strayEnd = parseFail("flowchart LR\n    end");
  assert.equal(strayEnd.line, 2);
  const linkStyle = parseFail(
    "flowchart LR\n    A --> B\n    linkStyle 0 stroke:#f00",
  );
  assert.equal(linkStyle.line, 3);
});

test("removeNode drops node, edges, membership, style and class entries", () => {
  const withoutDlq = removeNode(FIXTURE_MODEL, "DLQ");
  assert.ok(!withoutDlq.nodes.some((node) => node.id === "DLQ"));
  assert.ok(
    !withoutDlq.edges.some((edge) => edge.from === "DLQ" || edge.to === "DLQ"),
  );
  const asyncGroup = withoutDlq.groups.find((group) => group.id === "Async");
  assert.ok(asyncGroup);
  assert.ok(!asyncGroup.members.includes("DLQ"));
  assert.deepEqual(
    withoutDlq.classes.find((entry) => entry.name === "bad"),
    { ids: ["Reject"], name: "bad" },
  );

  const withoutReject = removeNode(withoutDlq, "Reject");
  assert.deepEqual(
    withoutReject.classes.filter((entry) => entry.name === "bad"),
    [],
  );
});
