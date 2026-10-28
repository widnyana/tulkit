import type { Arrow, Message, ParseResult, Party, SeqModel } from "./types.ts";

// Pure sequence parse/serialize. Invariant: serialize(parse(serialize(m)).model) === serialize(m)
// for canonical models (parse -> serialize is idempotent).

const ARROW_SYNTAX: Arrow[] = ["-->>", "->>", "--x", "-x", "-->", "->"];

const UNSUPPORTED_LINES = [
  "loop",
  "alt",
  "else",
  "opt",
  "par",
  "end",
  "note",
  "activate",
  "deactivate",
  "autonumber",
  "rect",
  "box",
];

function fail(reason: string, line: number): ParseResult {
  return { ok: false, reason, line };
}

function tryReadArrow(
  src: string,
  cursor: number,
): { arrow: Arrow; next: number } | null {
  for (const arrow of ARROW_SYNTAX) {
    if (src.startsWith(arrow, cursor)) {
      return { arrow, next: cursor + arrow.length };
    }
  }
  return null;
}

function tryReadId(
  src: string,
  cursor: number,
): { id: string; next: number } | null {
  const match = /^[A-Za-z0-9_]+/.exec(src.slice(cursor));
  if (!match) return null;
  return { id: match[0], next: cursor + match[0].length };
}

export function parseSequence(code: string): ParseResult {
  const lines = code.split("\n");
  const parties = new Map<string, Party>();
  const messages: Message[] = [];

  const ensureParty = (id: string): void => {
    if (!parties.has(id)) {
      parties.set(id, { id, label: null, actor: false });
    }
  };

  let sawHeader = false;

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    let src = lines[index].trim();
    if (src === "") continue;
    if (src.endsWith(";")) src = src.slice(0, -1).trimEnd();
    if (src === "") continue;

    if (!sawHeader) {
      const headerMatch = /^sequenceDiagram\b/.exec(src);
      if (!headerMatch)
        return fail("Expected a sequenceDiagram header", lineNumber);
      sawHeader = true;
      continue;
    }

    if (src.startsWith("%%")) continue;

    const lower = src.toLowerCase();
    const blocked = UNSUPPORTED_LINES.find(
      (word) => lower === word || lower.startsWith(`${word} `),
    );
    if (blocked)
      return fail(
        `Unsupported sequence line: ${lines[index].trim()}`,
        lineNumber,
      );

    const partyMatch =
      /^(participant|actor)\s+([A-Za-z0-9_]+)(?:\s+as\s+(.*))?$/s.exec(src);
    if (partyMatch) {
      const id = partyMatch[2];
      if (parties.has(id))
        return fail(`Participant ${id} is declared more than once`, lineNumber);
      const rawLabel = partyMatch[3];
      parties.set(id, {
        id,
        label: rawLabel === undefined ? null : rawLabel.trim() || null,
        actor: partyMatch[1] === "actor",
      });
      continue;
    }

    const fromRead = tryReadId(src, 0);
    if (!fromRead)
      return fail(`Cannot parse line: ${lines[index].trim()}`, lineNumber);
    let cursor = fromRead.next;
    while (src[cursor] === " ") cursor += 1;
    const arrowRead = tryReadArrow(src, cursor);
    if (!arrowRead)
      return fail(`Cannot parse line: ${lines[index].trim()}`, lineNumber);
    cursor = arrowRead.next;
    while (src[cursor] === " ") cursor += 1;
    const toRead = tryReadId(src, cursor);
    if (!toRead)
      return fail(`Cannot parse line: ${lines[index].trim()}`, lineNumber);
    cursor = toRead.next;
    while (src[cursor] === " ") cursor += 1;
    if (src[cursor] !== ":")
      return fail(`Cannot parse line: ${lines[index].trim()}`, lineNumber);
    cursor += 1;
    while (src[cursor] === " ") cursor += 1;
    const text = src.slice(cursor);

    ensureParty(fromRead.id);
    ensureParty(toRead.id);
    messages.push({
      from: fromRead.id,
      to: toRead.id,
      arrow: arrowRead.arrow,
      text,
    });
  }

  if (!sawHeader) return fail("Expected a sequenceDiagram header", 1);

  const model: SeqModel = {
    kind: "sequence",
    parties: [...parties.values()],
    messages,
  };
  return { ok: true, model };
}

function partyLine(party: Party): string {
  const keyword = party.actor ? "actor" : "participant";
  return party.label === null
    ? `    ${keyword} ${party.id}`
    : `    ${keyword} ${party.id} as ${party.label}`;
}

export function serializeSequence(model: SeqModel): string {
  const out: string[] = ["sequenceDiagram"];
  for (const party of model.parties) {
    out.push(partyLine(party));
  }
  for (const message of model.messages) {
    out.push(
      `    ${message.from} ${message.arrow} ${message.to}: ${message.text}`,
    );
  }
  return out.join("\n");
}
