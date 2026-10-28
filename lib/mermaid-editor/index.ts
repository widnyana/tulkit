import { parseFlowchart, serializeFlowchart } from "./flowchart.ts";
import { parseSequence, serializeSequence } from "./sequence.ts";
import type { Model, ParseResult } from "./types.ts";

// Local map of unsupported header keywords to display names. Kept here instead
// of importing from app/mermaid-editor/utils.ts to keep lib/ self-contained.
const TYPE_NAMES: Array<[RegExp, string]> = [
  [/^gantt\b/, "Gantt"],
  [/^pie\b/, "Pie"],
  [/^classDiagram\b/, "Class"],
  [/^stateDiagram(-v2)?\b/, "State"],
  [/^erDiagram\b/, "ER"],
  [/^mindmap\b/, "Mindmap"],
  [/^timeline\b/, "Timeline"],
  [/^gitGraph\b/, "Git graph"],
  [/^journey\b/, "Journey"],
];

const FLOWCHART_HEADER = /^(graph|flowchart)\b/;
const SEQUENCE_HEADER = /^sequenceDiagram\b/;
const TEXT_ONLY = /^(---|%%\{init\})/;

export function parseAny(code: string): ParseResult {
  const first = code
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line !== "" && !line.startsWith("%%"));

  if (first === undefined) {
    return {
      ok: true,
      model: { kind: "flowchart", dir: "TD", nodes: [], edges: [], pos: {} },
    };
  }

  if (TEXT_ONLY.test(first)) {
    return {
      ok: false,
      reason: "Front matter / init directives are Text-only for now.",
      line: null,
    };
  }

  if (FLOWCHART_HEADER.test(first)) return parseFlowchart(code);
  if (SEQUENCE_HEADER.test(first)) return parseSequence(code);

  const typeName = TYPE_NAMES.find(([pattern]) => pattern.test(first))?.[1];
  return {
    ok: false,
    reason: `Visual editing is not available for ${typeName ?? "this diagram type"} yet.`,
    line: null,
  };
}

export function serialize(model: Model): string {
  switch (model.kind) {
    case "flowchart":
      return serializeFlowchart(model);
    case "sequence":
      return serializeSequence(model);
  }
}
