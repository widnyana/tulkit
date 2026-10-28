import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSequence, serializeSequence } from "./sequence.ts";
import type { SeqModel } from "./types.ts";

function expectSequence(code: string): SeqModel {
  const result = parseSequence(code);
  assert.ok(result.ok);
  assert.equal(result.model.kind, "sequence");
  return result.model as SeqModel;
}

test("declared and implicit participants keep first-appearance order; serialize declares all", () => {
  const seq = expectSequence(
    ["sequenceDiagram", "participant A", "A->>B: hi", "participant C"].join(
      "\n",
    ),
  );
  assert.deepEqual(
    seq.parties.map((party) => party.id),
    ["A", "B", "C"],
  );
  assert.deepEqual(
    seq.parties.map((party) => party.label),
    [null, null, null],
  );
  assert.equal(
    serializeSequence(seq),
    [
      "sequenceDiagram",
      "    participant A",
      "    participant B",
      "    participant C",
      "    A ->> B: hi",
    ].join("\n"),
  );
});

test("participant A as Alice keeps id A and label Alice; actor U sets actor true", () => {
  const seq = expectSequence(
    ["sequenceDiagram", "participant A as Alice", "actor U", "A->>U: hey"].join(
      "\n",
    ),
  );
  assert.deepEqual(seq.parties, [
    { id: "A", label: "Alice", actor: false },
    { id: "U", label: null, actor: true },
  ]);
});

test("all six arrows round trip; -->> is not misread as --> plus >", () => {
  const arrows = ["->>", "-->>", "-x", "--x", "->", "-->"] as const;
  const lines = [
    "sequenceDiagram",
    ...arrows.map((arrow, i) => `P${i} ${arrow} Q${i}: m${i}`),
  ];
  const seq = expectSequence(lines.join("\n"));
  assert.deepEqual(
    seq.messages.map((message) => message.arrow),
    [...arrows],
  );
  const round = expectSequence(serializeSequence(seq));
  assert.deepEqual(round, seq);
});

test("A->>B: time: 10s keeps text time: 10s", () => {
  const seq = expectSequence("sequenceDiagram\nA->>B: time: 10s");
  assert.equal(seq.messages[0]?.text, "time: 10s");
});

test("empty text after : is allowed", () => {
  const seq = expectSequence("sequenceDiagram\nA->>B:");
  assert.equal(seq.messages[0]?.text, "");
});

test("loop, note right of A: x, and autonumber each fail with their line", () => {
  for (const line of ["loop every day", "note right of A: x", "autonumber"]) {
    const result = parseSequence(`sequenceDiagram\nA->>B: hi\n${line}`);
    assert.ok(!result.ok);
    assert.equal(result.line, 3);
    assert.match(result.reason, /Unsupported sequence line: /);
  }
});

test("serialize(parse(serialize(m))) is idempotent", () => {
  const code = [
    "sequenceDiagram",
    "participant A as Alice",
    "actor B as Bob",
    "A ->> B: hello",
    "B -->> A: hi there",
    "A -x B: stop",
    "B --x A: gone",
    "A -> B: plain",
    "B --> A: dotted back",
  ].join("\n");
  const parsed = expectSequence(code);
  const once = serializeSequence(parsed);
  const reparsed = expectSequence(once);
  assert.equal(serializeSequence(reparsed), once);
  assert.deepEqual(reparsed, parsed);
});
