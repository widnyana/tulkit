import assert from "node:assert/strict";
import { test } from "node:test";
import { edgeDomId, hitFromAttrs } from "./hit.ts";
import { parseAny } from "./index.ts";

const flowRes = parseAny(
  'graph TD\n    A[Start] --> B[End]\n    A --> B\n    subgraph G["Group"]\n        C[In]\n    end',
);
assert.ok(flowRes.ok);
const FLOW = flowRes.model;
assert.equal(FLOW.kind, "flowchart");
const seqRes = parseAny(
  "sequenceDiagram\n    participant Alice\n    participant Bob\n    Alice ->> Bob: Hi",
);
assert.ok(seqRes.ok);
const SEQ = seqRes.model;
assert.equal(SEQ.kind, "sequence");

test("node hit from flowchart svg id", () => {
  assert.deepEqual(
    hitFromAttrs(
      {
        domId: "mermaid-1-flowchart-A-0",
        et: null,
        id: null,
        order: -1,
        clusterDomId: null,
        svgId: null,
      },
      FLOW,
    ),
    { kind: "node", id: "A" },
  );
});

test("node hit with underscore in id", () => {
  const mRes = parseAny("graph TD\n    my_node[Node]");
  assert.ok(mRes.ok);
  const m = mRes.model;
  assert.equal(m.kind, "flowchart");
  assert.deepEqual(
    hitFromAttrs(
      {
        domId: "x-flowchart-my_node-3",
        et: null,
        id: null,
        order: -1,
        clusterDomId: null,
        svgId: null,
      },
      m,
    ),
    { kind: "node", id: "my_node" },
  );
});

test("unknown node id is empty", () => {
  assert.deepEqual(
    hitFromAttrs(
      {
        domId: "x-flowchart-nope-0",
        et: null,
        id: null,
        order: -1,
        clusterDomId: null,
        svgId: null,
      },
      FLOW,
    ),
    { kind: "empty" },
  );
});

test("edge hit by data-id", () => {
  assert.deepEqual(
    hitFromAttrs(
      {
        domId: null,
        et: "edge",
        id: "L_A_B_0",
        order: -1,
        clusterDomId: null,
        svgId: null,
      },
      FLOW,
    ),
    { kind: "edge", index: 0 },
  );
});

test("two A to B edges get distinct indexes", () => {
  assert.equal(edgeDomId(FLOW, 0), "L_A_B_0");
  assert.equal(edgeDomId(FLOW, 1), "L_A_B_2");
  assert.deepEqual(
    hitFromAttrs(
      {
        domId: null,
        et: "edge",
        id: "L_A_B_2",
        order: -1,
        clusterDomId: null,
        svgId: null,
      },
      FLOW,
    ),
    {
      kind: "edge",
      index: 1,
    },
  );
});

test("edge with underscored node ids", () => {
  const mRes = parseAny("graph TD\n    a_b --> c");
  assert.ok(mRes.ok);
  const m = mRes.model;
  assert.equal(m.kind, "flowchart");
  assert.equal(edgeDomId(m, 0), "L_a_b_c_0");
  assert.deepEqual(
    hitFromAttrs(
      {
        domId: null,
        et: "edge",
        id: "L_a_b_c_0",
        order: -1,
        clusterDomId: null,
        svgId: null,
      },
      m,
    ),
    {
      kind: "edge",
      index: 0,
    },
  );
});

test("cluster hit and unknown cluster", () => {
  assert.deepEqual(
    hitFromAttrs(
      {
        domId: null,
        et: null,
        id: null,
        order: -1,
        clusterDomId: "mermaid-3-G",
        svgId: "mermaid-3",
      },
      FLOW,
    ),
    {
      kind: "group",
      id: "G",
    },
  );
  assert.deepEqual(
    hitFromAttrs(
      {
        domId: null,
        et: null,
        id: null,
        order: -1,
        clusterDomId: "mermaid-3-X",
        svgId: "mermaid-3",
      },
      FLOW,
    ),
    {
      kind: "empty",
    },
  );
  const dashRes = parseAny("graph TD\n    subgraph gg\n        C[In]\n    end");
  assert.ok(dashRes.ok);
  const dashBase = dashRes.model;
  assert.equal(dashBase.kind, "flowchart");
  const dash = {
    ...dashBase,
    kind: "flowchart",
    groups: [{ id: "my-group", title: "Dash", dir: null, members: [] }],
  } as typeof dashBase;
  assert.deepEqual(
    hitFromAttrs(
      {
        domId: null,
        et: null,
        id: null,
        order: -1,
        clusterDomId: "mermaid-3-my-group",
        svgId: "mermaid-3",
      },
      dash,
    ),
    {
      kind: "group",
      id: "my-group",
    },
  );
});

test("participant and life-line hits", () => {
  for (const et of ["participant", "life-line"]) {
    assert.deepEqual(
      hitFromAttrs(
        {
          domId: null,
          et,
          id: "Alice",
          order: -1,
          clusterDomId: null,
          svgId: null,
        },
        SEQ,
      ),
      {
        kind: "party",
        id: "Alice",
      },
    );
  }
  assert.deepEqual(
    hitFromAttrs(
      {
        domId: null,
        et: "participant",
        id: "Zed",
        order: -1,
        clusterDomId: null,
        svgId: null,
      },
      SEQ,
    ),
    {
      kind: "empty",
    },
  );
});

test("message order maps to index; out of range is empty", () => {
  assert.deepEqual(
    hitFromAttrs(
      {
        domId: null,
        et: "message",
        id: null,
        order: 0,
        clusterDomId: null,
        svgId: null,
      },
      SEQ,
    ),
    {
      kind: "message",
      index: 0,
    },
  );
  assert.deepEqual(
    hitFromAttrs(
      {
        domId: null,
        et: "message",
        id: null,
        order: 5,
        clusterDomId: null,
        svgId: null,
      },
      SEQ,
    ),
    {
      kind: "empty",
    },
  );
});

test("flowchart attrs on a sequence model are empty", () => {
  assert.deepEqual(
    hitFromAttrs(
      {
        domId: "mermaid-1-flowchart-A-0",
        et: null,
        id: null,
        order: -1,
        clusterDomId: null,
        svgId: null,
      },
      SEQ,
    ),
    { kind: "empty" },
  );
});
