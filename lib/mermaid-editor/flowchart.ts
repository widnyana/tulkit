import type {
  Direction,
  EdgeStyle,
  FlowEdge,
  FlowModel,
  FlowNode,
  ParseResult,
  Shape,
} from "./types.ts";

// Pure flowchart parse/serialize. Invariant: serialize(parse(serialize(m)).model) === serialize(m)
// for canonical models (parse -> serialize is idempotent).

const SHAPE_SYNTAX: Array<{ shape: Shape; open: string; close: string }> = [
  { shape: "circle", open: "((", close: "))" },
  { shape: "stadium", open: "([", close: "])" },
  { shape: "rect", open: "[", close: "]" },
  { shape: "round", open: "(", close: ")" },
  { shape: "diamond", open: "{", close: "}" },
];

const LINK_SYNTAX: Array<{ style: EdgeStyle; op: string }> = [
  { style: "solid", op: "-->" },
  { style: "dotted", op: "-.->" },
  { style: "thick", op: "==>" },
];

const DIRS: Direction[] = ["TD", "TB", "LR", "RL", "BT"];

function fail(reason: string, line: number): ParseResult {
  return { ok: false, reason, line };
}

function decodeText(text: string, quoted: boolean): string {
  const decoded = text.replace(/#quot;/g, '"');
  return quoted ? decoded : decoded.trim();
}

function tryReadQuotedOrPlain(
  src: string,
  cursor: number,
): { text: string; quoted: boolean; next: number } | null {
  if (src[cursor] === '"') {
    const end = src.indexOf('"', cursor + 1);
    if (end === -1) return null;
    return {
      text: decodeText(src.slice(cursor + 1, end), true),
      quoted: true,
      next: end + 1,
    };
  }
  let i = cursor;
  while (i < src.length && !'])}"|'.includes(src[i])) i += 1;
  if (i === cursor) return null;
  return {
    text: decodeText(src.slice(cursor, i), false),
    quoted: false,
    next: i,
  };
}

function tryReadId(
  src: string,
  cursor: number,
): { id: string; next: number } | null {
  const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(cursor));
  if (!match || match[0] === "end") return null;
  return { id: match[0], next: cursor + match[0].length };
}

function tryReadShape(
  src: string,
  cursor: number,
): { shape: Shape; label: string; next: number } | null {
  for (const syntax of SHAPE_SYNTAX) {
    if (!src.startsWith(syntax.open, cursor)) continue;
    const bodyStart = cursor + syntax.open.length;
    const read = tryReadQuotedOrPlain(src, bodyStart);
    const bodyEnd = read ? read.next : bodyStart;
    const label = read ? read.text : "";
    if (src.startsWith(syntax.close, bodyEnd)) {
      return {
        shape: syntax.shape,
        label,
        next: bodyEnd + syntax.close.length,
      };
    }
  }
  return null;
}

function tryReadLink(
  src: string,
  cursor: number,
): { style: EdgeStyle; label: string | null; next: number } | null {
  for (const syntax of LINK_SYNTAX) {
    if (!src.startsWith(syntax.op, cursor)) continue;
    let next = cursor + syntax.op.length;
    let label: string | null = null;
    if (src[next] === "|") {
      const end = src.indexOf("|", next + 1);
      if (end === -1) return null;
      label = src
        .slice(next + 1, end)
        .replace(/#124;/g, "|")
        .trim();
      next = end + 1;
    }
    return { style: syntax.style, label, next };
  }
  return null;
}

export function parseFlowchart(code: string): ParseResult {
  const lines = code.split("\n");
  let dir: Direction | null = null;
  let sawHeader = false;
  const nodes = new Map<string, FlowNode>();
  const edges: FlowEdge[] = [];
  const layout: Record<string, [number, number]> = {};

  const ensureNode = (id: string): FlowNode => {
    let node = nodes.get(id);
    if (!node) {
      node = { id, label: "", shape: "rect" };
      nodes.set(id, node);
    }
    return node;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    let src = lines[index].trim();
    if (src === "") continue;
    if (src.endsWith(";")) src = src.slice(0, -1).trimEnd();
    if (src === "") continue;

    if (src.startsWith("%%")) {
      const rest = src.slice(2);
      const layoutMatch = /^\s*tulkit-layout\s+(\{.*\})\s*$/.exec(rest);
      if (layoutMatch) {
        try {
          const parsed: unknown = JSON.parse(
            // NaN is invalid JSON; treat it as null so only the bad entry is
            // dropped instead of the whole layout line.
            layoutMatch[1].replace(/\bNaN\b/g, "null"),
          );
          if (parsed !== null && typeof parsed === "object") {
            for (const [id, value] of Object.entries(
              parsed as Record<string, unknown>,
            )) {
              if (
                Array.isArray(value) &&
                value.length === 2 &&
                Number.isFinite(value[0]) &&
                Number.isFinite(value[1])
              ) {
                layout[id] = [value[0] as number, value[1] as number];
              }
            }
          }
        } catch {
          // Invalid JSON layout is dropped without failing.
        }
        continue;
      }
      return fail(
        "Comments are not supported in the visual editor",
        lineNumber,
      );
    }

    const headerMatch = /^(graph|flowchart)\s+(\S+)$/.exec(src);
    if (headerMatch) {
      if (sawHeader)
        return fail("Only one flowchart header is allowed", lineNumber);
      const candidate = headerMatch[2] as Direction;
      if (!DIRS.includes(candidate))
        return fail(`Unknown direction: ${headerMatch[2]}`, lineNumber);
      dir = candidate;
      sawHeader = true;
      continue;
    }

    if (!sawHeader)
      return fail("Expected a flowchart header (graph TD)", lineNumber);

    let cursor = 0;
    const read = tryReadId(src, cursor);
    if (!read)
      return fail(`Cannot parse line: ${lines[index].trim()}`, lineNumber);
    cursor = read.next;
    const firstId = read.id;
    let cursorAfterFirst = cursor;
    const firstShape = tryReadShape(src, cursorAfterFirst);
    if (firstShape) {
      cursorAfterFirst = firstShape.next;
      const node = ensureNode(firstId);
      node.shape = firstShape.shape;
      node.label = firstShape.label;
    } else {
      ensureNode(firstId);
    }

    let prevId = firstId;
    let cursorAt = cursorAfterFirst;
    while (cursorAt < src.length) {
      while (src[cursorAt] === " ") cursorAt += 1;
      if (cursorAt >= src.length) break;
      const linkRead = tryReadLink(src, cursorAt);
      if (!linkRead)
        return fail(`Cannot parse line: ${lines[index].trim()}`, lineNumber);
      cursorAt = linkRead.next;
      while (src[cursorAt] === " ") cursorAt += 1;
      const nextId = tryReadId(src, cursorAt);
      if (!nextId)
        return fail(`Cannot parse line: ${lines[index].trim()}`, lineNumber);
      cursorAt = nextId.next;
      const nextShape = tryReadShape(src, cursorAt);
      if (nextShape) {
        cursorAt = nextShape.next;
        const node = ensureNode(nextId.id);
        node.shape = nextShape.shape;
        node.label = nextShape.label;
      } else {
        ensureNode(nextId.id);
      }
      edges.push({
        from: prevId,
        to: nextId.id,
        label: linkRead.label,
        style: linkRead.style,
      });
      prevId = nextId.id;
    }
  }

  if (!sawHeader || !dir)
    return fail("Expected a flowchart header (graph TD)", 1);

  const pos: Record<string, [number, number]> = {};
  for (const node of nodes.values()) {
    const entry = layout[node.id];
    if (entry) pos[node.id] = entry;
  }

  const model: FlowModel = {
    kind: "flowchart",
    dir,
    nodes: [...nodes.values()],
    edges,
    pos,
  };
  return { ok: true, model };
}

function encodeNodeText(label: string): string {
  const needsQuote =
    label === "" ||
    /[[\]{}()|"<>#;]/.test(label) ||
    label.startsWith(" ") ||
    label.endsWith(" ");
  if (!needsQuote) return label;
  return `"${label.replace(/"/g, "#quot;")}"`;
}

function linkOp(style: EdgeStyle): string {
  return LINK_SYNTAX.find((syntax) => syntax.style === style)?.op ?? "-->";
}

function shapeSyntax(shape: Shape): { open: string; close: string } {
  return (
    SHAPE_SYNTAX.find((syntax) => syntax.shape === shape) ?? SHAPE_SYNTAX[2]
  );
}

export function serializeFlowchart(model: FlowModel): string {
  const out: string[] = [`flowchart ${model.dir}`];
  for (const node of model.nodes) {
    const syntax = shapeSyntax(node.shape);
    out.push(
      `    ${node.id}${syntax.open}${encodeNodeText(node.label)}${syntax.close}`,
    );
  }
  for (const edge of model.edges) {
    const label =
      edge.label === null ? "" : `|${edge.label.replace(/\|/g, "#124;")}|`;
    out.push(`    ${edge.from} ${linkOp(edge.style)}${label} ${edge.to}`);
  }
  const layoutEntries = model.nodes
    .filter((node) => node.id in model.pos)
    .map((node) => {
      const [x, y] = model.pos[node.id];
      return `${JSON.stringify(node.id)}:[${Math.round(x)},${Math.round(y)}]`;
    });
  if (layoutEntries.length > 0) {
    out.push(`%% tulkit-layout {${layoutEntries.join(",")}}`);
  }
  return out.join("\n");
}
