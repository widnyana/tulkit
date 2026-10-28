import type {
  Direction,
  EdgeStyle,
  FlowEdge,
  FlowGroup,
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
  { shape: "cylinder", open: "[(", close: ")]" },
  { shape: "hexagon", open: "{{", close: "}}" },
  { shape: "rect", open: "[", close: "]" },
  { shape: "round", open: "(", close: ")" },
  { shape: "diamond", open: "{", close: "}" },
];

const LINK_SYNTAX: Array<{ style: EdgeStyle; op: string }> = [
  { style: "solid", op: "-->" },
  { style: "dotted", op: "-.->" },
  { style: "thick", op: "==>" },
];

const INLINE_LINK_SYNTAX: Array<{
  style: EdgeStyle;
  pattern: RegExp;
}> = [
  { style: "solid", pattern: /^--\s*(.*?)\s*-->/ },
  { style: "dotted", pattern: /^-\.\s*(.*?)\s*\.->/ },
  { style: "thick", pattern: /^==\s*(.*?)\s*==>/ },
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

function tryReadNode(
  src: string,
  cursor: number,
): {
  id: string;
  shape: { shape: Shape; label: string } | null;
  next: number;
} | null {
  const idRead = tryReadId(src, cursor);
  if (!idRead) return null;
  let next = idRead.next;
  const shape = tryReadShape(src, next);
  if (shape) next = shape.next;
  return { id: idRead.id, shape, next };
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
  for (const syntax of INLINE_LINK_SYNTAX) {
    const match = syntax.pattern.exec(src.slice(cursor));
    if (!match) continue;
    const text = match[1].trim();
    return {
      style: syntax.style,
      label: text === "" ? null : text,
      next: cursor + match[0].length,
    };
  }
  return null;
}

export function parseFlowchart(code: string): ParseResult {
  const lines = code.split("\n");
  let dir: Direction | null = null;
  let sawHeader = false;
  const nodes = new Map<string, FlowNode>();
  const edges: FlowEdge[] = [];
  const groups: FlowGroup[] = [];
  const classDefs: string[] = [];
  const classes: { ids: string[]; name: string }[] = [];
  const styles: { id: string; rest: string }[] = [];
  const layout: Record<string, [number, number]> = {};
  let currentGroup: FlowGroup | null = null;

  const ensureNode = (id: string): FlowNode => {
    let node = nodes.get(id);
    if (!node) {
      node = { id, label: "", shape: "rect" };
      nodes.set(id, node);
      if (currentGroup) currentGroup.members.push(id);
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

    if (src === "end") {
      if (!currentGroup)
        return fail("end without a matching subgraph", lineNumber);
      currentGroup = null;
      continue;
    }

    if (src.startsWith("subgraph")) {
      if (currentGroup)
        return fail(
          "Nested subgraphs are not supported in Visual mode yet",
          lineNumber,
        );
      const body = src.slice("subgraph".length).trim();
      if (body === "")
        return fail(`Cannot parse line: ${lines[index].trim()}`, lineNumber);
      const idRead = tryReadId(body, 0);
      let id: string;
      let title: string;
      if (idRead) {
        id = idRead.id;
        title = idRead.id;
        const rest = body.slice(idRead.next).trim();
        const titleMatch = /^\["([^\]]*)"\]$/.exec(rest);
        if (titleMatch) title = decodeText(titleMatch[1], true);
        else if (rest !== "")
          return fail(`Cannot parse line: ${lines[index].trim()}`, lineNumber);
      } else {
        const quotedRead = tryReadQuotedOrPlain(body, 0);
        if (!quotedRead?.quoted)
          return fail(`Cannot parse line: ${lines[index].trim()}`, lineNumber);
        id = `G${groups.length + 1}`;
        title = quotedRead.text;
      }
      currentGroup = { id, title, dir: null, members: [] };
      groups.push(currentGroup);
      continue;
    }

    if (src.startsWith("direction ")) {
      const candidate = src.slice("direction ".length).trim() as Direction;
      if (
        !currentGroup ||
        currentGroup.dir !== null ||
        !DIRS.includes(candidate)
      )
        return fail(`Cannot parse line: ${lines[index].trim()}`, lineNumber);
      currentGroup.dir = candidate;
      continue;
    }

    if (src.startsWith("classDef ")) {
      classDefs.push(src.slice("classDef ".length).trim());
      continue;
    }

    if (src.startsWith("class ")) {
      const rest = src.slice("class ".length).trim();
      const match = /^(.+?)\s+([A-Za-z_][A-Za-z0-9_]*)$/.exec(rest);
      if (!match)
        return fail(`Cannot parse line: ${lines[index].trim()}`, lineNumber);
      classes.push({
        ids: match[1].split(",").map((part) => part.trim()),
        name: match[2],
      });
      continue;
    }

    if (src.startsWith("style ")) {
      const rest = src.slice("style ".length).trim();
      const match = /^([A-Za-z_][A-Za-z0-9_]*)\s+(.+)$/.exec(rest);
      if (!match)
        return fail(`Cannot parse line: ${lines[index].trim()}`, lineNumber);
      styles.push({ id: match[1], rest: match[2].trim() });
      continue;
    }

    if (/^(linkStyle|click)\b/.test(src) || src.includes(":::")) {
      return fail(`Cannot parse line: ${lines[index].trim()}`, lineNumber);
    }

    let cursor = 0;
    const first = tryReadNode(src, cursor);
    if (!first)
      return fail(`Cannot parse line: ${lines[index].trim()}`, lineNumber);
    cursor = first.next;
    if (first.shape) {
      const node = ensureNode(first.id);
      node.shape = first.shape.shape;
      node.label = first.shape.label;
    } else {
      ensureNode(first.id);
    }

    let fromIds = [first.id];
    let cursorAt = cursor;
    while (cursorAt < src.length) {
      while (src[cursorAt] === " ") cursorAt += 1;
      if (cursorAt >= src.length) break;
      if (src[cursorAt] === "&") {
        cursorAt += 1;
        while (src[cursorAt] === " ") cursorAt += 1;
        const next = tryReadNode(src, cursorAt);
        if (!next)
          return fail(`Cannot parse line: ${lines[index].trim()}`, lineNumber);
        cursorAt = next.next;
        if (next.shape) {
          const node = ensureNode(next.id);
          node.shape = next.shape.shape;
          node.label = next.shape.label;
        } else {
          ensureNode(next.id);
        }
        fromIds.push(next.id);
        continue;
      }
      const linkRead = tryReadLink(src, cursorAt);
      if (!linkRead)
        return fail(`Cannot parse line: ${lines[index].trim()}`, lineNumber);
      cursorAt = linkRead.next;
      const targets: string[] = [];
      let parsedFirstTarget = false;
      while (cursorAt < src.length || !parsedFirstTarget) {
        while (src[cursorAt] === " ") cursorAt += 1;
        const next = tryReadNode(src, cursorAt);
        if (!next) {
          if (parsedFirstTarget && src[cursorAt] === "&") break;
          return fail(`Cannot parse line: ${lines[index].trim()}`, lineNumber);
        }
        cursorAt = next.next;
        if (next.shape) {
          const node = ensureNode(next.id);
          node.shape = next.shape.shape;
          node.label = next.shape.label;
        } else {
          ensureNode(next.id);
        }
        targets.push(next.id);
        parsedFirstTarget = true;
        const save = cursorAt;
        while (src[cursorAt] === " ") cursorAt += 1;
        if (src[cursorAt] === "&") {
          cursorAt += 1;
          continue;
        }
        cursorAt = save;
        break;
      }
      for (const from of fromIds) {
        for (const to of targets) {
          edges.push({
            from,
            to,
            label: linkRead.label,
            style: linkRead.style,
          });
        }
      }
      fromIds = targets;
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
    groups,
    classDefs,
    classes,
    styles,
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
    SHAPE_SYNTAX.find((syntax) => syntax.shape === shape) ?? {
      open: "[",
      close: "]",
    }
  );
}

function nodeDefLine(node: FlowNode, indent: string): string {
  const syntax = shapeSyntax(node.shape);
  return `${indent}${node.id}${syntax.open}${encodeNodeText(node.label)}${syntax.close}`;
}

export function serializeFlowchart(model: FlowModel): string {
  const out: string[] = [`flowchart ${model.dir}`];
  const grouped = new Set<string>();
  for (const group of model.groups) {
    for (const member of group.members) grouped.add(member);
  }
  for (const group of model.groups) {
    const header =
      group.title === group.id
        ? group.id
        : `${group.id}["${group.title.replace(/"/g, "#quot;")}"]`;
    out.push(`    subgraph ${header}`);
    if (group.dir) out.push(`        direction ${group.dir}`);
    for (const memberId of group.members) {
      const node = model.nodes.find((entry) => entry.id === memberId);
      if (node) out.push(nodeDefLine(node, "        "));
    }
    out.push("    end");
  }
  for (const node of model.nodes) {
    if (grouped.has(node.id)) continue;
    out.push(nodeDefLine(node, "    "));
  }
  for (const edge of model.edges) {
    const label =
      edge.label === null ? "" : `|${edge.label.replace(/\|/g, "#124;")}|`;
    out.push(`    ${edge.from} ${linkOp(edge.style)}${label} ${edge.to}`);
  }
  for (const classDef of model.classDefs) {
    out.push(`    classDef ${classDef}`);
  }
  for (const entry of model.classes) {
    out.push(`    class ${entry.ids.join(",")} ${entry.name}`);
  }
  for (const entry of model.styles) {
    out.push(`    style ${entry.id} ${entry.rest}`);
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

export function removeNode(model: FlowModel, id: string): FlowModel {
  return {
    ...model,
    nodes: model.nodes.filter((node) => node.id !== id),
    edges: model.edges.filter((edge) => edge.from !== id && edge.to !== id),
    pos: Object.fromEntries(
      Object.entries(model.pos).filter(([key]) => key !== id),
    ),
    groups: model.groups.map((group) => ({
      ...group,
      members: group.members.filter((member) => member !== id),
    })),
    classes: model.classes
      .map((entry) => ({ ...entry, ids: entry.ids.filter((x) => x !== id) }))
      .filter((entry) => entry.ids.length > 0),
    styles: model.styles.filter((entry) => entry.id !== id),
  };
}
