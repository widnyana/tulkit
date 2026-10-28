import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAny, serialize } from "./index.ts";
import type { FlowModel, SeqModel } from "./types.ts";
import {
  addMessage,
  addNode,
  addParty,
  connect,
  removeEdge,
  removeMessage,
  removeParty,
  renameEdge,
  renameGroup,
  renameMessage,
  renameNode,
  renameParty,
} from "./edit.ts";

function flow() {
  const r = parseAny("graph TD\n    A[Start]");
  assert.ok(r.ok);
  assert.equal(r.model.kind, "flowchart");
  return r.model as FlowModel;
}

function flow2() {
  return addNode(flow(), "rect").model;
}

function seq() {
  const r = parseAny(
    "sequenceDiagram\n    participant A\n    participant B\n    A->>B: hello",
  );
  assert.ok(r.ok);
  assert.equal(r.model.kind, "sequence");
  return r.model as SeqModel;
}

test("addNode gives next id and serialized label", () => {
  const m = flow();
  const { model, id } = addNode(m, "rect");
  assert.equal(id, "B");
  assert.ok(serialize(model).includes("B[Node]"));
});

test("addNode with from adds an edge", () => {
  const m = flow();
  const { model, id } = addNode(m, "rect", { from: "A" });
  assert.ok(serialize(model).includes("A --> B"));
  assert.deepEqual(model.edges[0], {
    from: "A",
    to: id,
    label: null,
    style: "solid",
  });
});

test("addNode with group adds member inside subgraph", () => {
  const r = parseAny(
    'graph TD\n    subgraph G1["Group"]\n    A[Start]\n    end',
  );
  assert.ok(r.ok);
  const m = r.model as FlowModel;
  const { model, id } = addNode(m, "rect", { group: "G1" });
  const g = model.groups.find((x) => x.id === "G1");
  assert.ok(g?.members.includes(id));
  assert.ok(serialize(model).includes("B[Node]"));
});

test("addNode with unknown from only adds the node", () => {
  const m = flow();
  const { model, id } = addNode(m, "rect", { from: "ZZ" });
  assert.equal(id, "B");
  assert.equal(model.edges.length, 0);
});

test("connect adds an edge and duplicate connect returns same reference", () => {
  const r = parseAny("graph TD\n    A[Start]\n    B[End]");
  assert.ok(r.ok);
  const m = r.model as FlowModel;
  const m1 = connect(m, "A", "B");
  assert.equal(m1.edges.length, 1);
  const m2 = connect(m1, "A", "B");
  assert.equal(m1, m2);
  assert.equal(connect(m, "ZZ", "B"), m);
});

test("renameNode renames the label", () => {
  const m = flow();
  const m1 = renameNode(m, "A", "Begin");
  assert.equal(m1.nodes[0].label, "Begin");
  assert.equal(renameNode(m, "ZZ", "x"), m);
});

test("renameEdge sets label then null on empty", () => {
  const m = connect(flow2(), "A", "B");
  const m1 = renameEdge(m, 0, "Yes");
  assert.equal(m1.edges[0].label, "Yes");
  const m2 = renameEdge(m1, 0, "  ");
  assert.equal(m2.edges[0].label, null);
  assert.equal(renameEdge(m, 9, "x"), m);
});

test("removeEdge removes only the given edge", () => {
  const m = connect(flow2(), "A", "B");
  const m1 = connect(m, "B", "A");
  const m2 = removeEdge(m1, 0);
  assert.equal(m2.edges.length, 1);
  assert.equal(m2.edges[0].from, "B");
  assert.equal(removeEdge(m, 9), m);
});

test("renameGroup renames the title", () => {
  const r = parseAny('graph TD\n    subgraph G1["Old"]\n    A[Start]\n    end');
  assert.ok(r.ok);
  const m = r.model as FlowModel;
  const m1 = renameGroup(m, "G1", "New");
  assert.equal(m1.groups[0].title, "New");
  assert.equal(renameGroup(m, "ZZ", "x"), m);
});

test("input model is never mutated", () => {
  const m = flow();
  const before = structuredClone(m);
  const { model } = addNode(m, "rect", { from: "A", group: undefined });
  connect(model, "B", "A");
  renameNode(model, "A", "x");
  renameEdge(model, 0, "y");
  removeEdge(model, 0);
  renameGroup(model, "ZZ", "z");
  const s = seq();
  const sBefore = structuredClone(s);
  const sm = addParty(s, true, 0).model;
  const sm2 = addMessage(sm, "P1", "P2", 0).model;
  renameParty(sm2, "P1", "a");
  renameMessage(sm2, 0, "b");
  removeMessage(sm2, 0);
  removeParty(sm2, "P1");
  assert.deepEqual(m, before);
  assert.deepEqual(s, sBefore);
});

test("addParty ids and position", () => {
  const m = seq();
  const { model: m1, id: id1 } = addParty(m, true);
  assert.equal(id1, "P1");
  const { model: m2, id: id2 } = addParty(m1, false);
  assert.equal(id2, "P2");
  const { model: m3 } = addParty(m2, true, 0);
  assert.equal(m3.parties[0].id, "P3");
});

test("addMessage inserts at index, unknown party returns -1", () => {
  const m = seq();
  const { model, index } = addMessage(m, "A", "B", 0);
  assert.equal(index, 0);
  assert.equal(model.messages[0].text, "message");
  const res = addMessage(m, "A", "ZZ", 0);
  assert.equal(res.index, -1);
  assert.equal(res.model, m);
});

test("renameParty empty sets null", () => {
  const m = seq();
  const m1 = renameParty(m, "A", "  ");
  assert.equal(m1.parties[0].label, null);
  const m2 = renameParty(m, "A", "X");
  assert.equal(m2.parties[0].label, "X");
  assert.equal(renameParty(m, "ZZ", "x"), m);
});

test("removeParty drops its messages", () => {
  const m = seq();
  const m1 = removeParty(m, "A");
  assert.equal(m1.parties.length, 1);
  assert.equal(m1.messages.length, 0);
  assert.equal(removeParty(m, "ZZ"), m);
});

test("removeMessage removes only the given message", () => {
  const m = seq();
  const { model: m1 } = addMessage(m, "B", "A", undefined);
  const m2 = removeMessage(m1, 0);
  assert.equal(m2.messages.length, 1);
  assert.equal(m2.messages[0].from, "B");
  assert.equal(removeMessage(m, 9), m);
});
