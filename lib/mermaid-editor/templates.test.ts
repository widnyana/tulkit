import assert from "node:assert/strict";
import test from "node:test";
import { parseAny, serialize } from "./index.ts";
import { DIAGRAM_TEMPLATES } from "./templates.ts";

const EXPECTED_KEYS = [
  "flowchart",
  "sequence",
  "class",
  "state",
  "er",
  "gantt",
  "pie",
  "mindmap",
  "timeline",
  "gitgraph",
];

test("keys are unique and in the expected order", () => {
  const keys = DIAGRAM_TEMPLATES.map((t) => t.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.deepEqual(keys, EXPECTED_KEYS);
});

test("visual templates parse and are already canonical", () => {
  for (const t of DIAGRAM_TEMPLATES.filter((t) => t.visual)) {
    const result = parseAny(t.code);
    assert.ok(
      result.ok,
      `${t.key} should parse: ${result.ok ? "ok" : result.reason}`,
    );
    assert.equal(serialize(result.model), t.code, `${t.key} canonical form`);
  }
});

test("non-visual templates are not parseable for visual editing", () => {
  for (const t of DIAGRAM_TEMPLATES.filter((t) => !t.visual)) {
    const result = parseAny(t.code);
    assert.equal(result.ok, false, `${t.key} should not parse as visual`);
  }
});
