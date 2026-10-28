import type { FlowModel, SeqModel, Shape } from "./types.ts";
import { nextNodeId } from "./layout.ts";

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

export function addNode(
  m: FlowModel,
  shape: Shape,
  opts?: { from?: string; group?: string },
): { model: FlowModel; id: string } {
  const id = nextNodeId(m.nodes.map((n) => n.id));
  const model: FlowModel = {
    ...m,
    nodes: [...m.nodes, { id, label: "Node", shape }],
  };
  if (opts?.from && m.nodes.some((n) => n.id === opts.from)) {
    model.edges = [
      ...model.edges,
      { from: opts.from, to: id, label: null, style: "solid" },
    ];
  }
  if (opts?.group && m.groups.some((g) => g.id === opts.group)) {
    model.groups = model.groups.map((g) =>
      g.id === opts.group ? { ...g, members: [...g.members, id] } : g,
    );
  }
  return { model, id };
}

export function connect(m: FlowModel, from: string, to: string): FlowModel {
  if (
    !m.nodes.some((n) => n.id === from) ||
    !m.nodes.some((n) => n.id === to) ||
    m.edges.some((e) => e.from === from && e.to === to)
  ) {
    return m;
  }
  return {
    ...m,
    edges: [...m.edges, { from, to, label: null, style: "solid" }],
  };
}

export function renameNode(m: FlowModel, id: string, label: string): FlowModel {
  const index = m.nodes.findIndex((n) => n.id === id);
  if (index === -1) return m;
  const nodes = m.nodes.map((n) => (n.id === id ? { ...n, label } : n));
  return { ...m, nodes };
}

export function renameEdge(
  m: FlowModel,
  index: number,
  label: string,
): FlowModel {
  if (index < 0 || index >= m.edges.length) return m;
  const trimmed = label.trim();
  const value = trimmed === "" ? null : trimmed;
  const edges = m.edges.map((e, i) =>
    i === index ? { ...e, label: value } : e,
  );
  return { ...m, edges };
}

export function removeEdge(m: FlowModel, index: number): FlowModel {
  if (index < 0 || index >= m.edges.length) return m;
  return { ...m, edges: m.edges.filter((_, i) => i !== index) };
}

export function renameGroup(
  m: FlowModel,
  id: string,
  title: string,
): FlowModel {
  if (!m.groups.some((g) => g.id === id)) return m;
  return {
    ...m,
    groups: m.groups.map((g) => (g.id === id ? { ...g, title } : g)),
  };
}

function nextPartyId(existing: Iterable<string>): string {
  const used = new Set(existing);
  let n = 1;
  while (used.has(`P${n}`)) n += 1;
  return `P${n}`;
}

export function addParty(
  m: SeqModel,
  actor: boolean,
  at?: number,
): { model: SeqModel; id: string } {
  const id = nextPartyId(m.parties.map((p) => p.id));
  const index = clamp(at ?? m.parties.length, 0, m.parties.length);
  const parties = [...m.parties];
  parties.splice(index, 0, { id, label: null, actor });
  return { model: { ...m, parties }, id };
}

export function addMessage(
  m: SeqModel,
  from: string,
  to: string,
  at?: number,
): { model: SeqModel; index: number } {
  const ids = new Set(m.parties.map((p) => p.id));
  if (!ids.has(from) || !ids.has(to)) {
    return { model: m, index: -1 };
  }
  const index = clamp(at ?? m.messages.length, 0, m.messages.length);
  const messages = [...m.messages];
  messages.splice(index, 0, { from, to, arrow: "->>", text: "message" });
  return { model: { ...m, messages }, index };
}

export function renameParty(m: SeqModel, id: string, label: string): SeqModel {
  if (!m.parties.some((p) => p.id === id)) return m;
  const trimmed = label.trim();
  const value = trimmed === "" ? null : trimmed;
  return {
    ...m,
    parties: m.parties.map((p) => (p.id === id ? { ...p, label: value } : p)),
  };
}

export function renameMessage(
  m: SeqModel,
  index: number,
  text: string,
): SeqModel {
  if (index < 0 || index >= m.messages.length) return m;
  return {
    ...m,
    messages: m.messages.map((msg, i) =>
      i === index ? { ...msg, text } : msg,
    ),
  };
}

export function removeParty(m: SeqModel, id: string): SeqModel {
  if (!m.parties.some((p) => p.id === id)) return m;
  return {
    ...m,
    parties: m.parties.filter((p) => p.id !== id),
    messages: m.messages.filter((msg) => msg.from !== id && msg.to !== id),
  };
}

export function removeMessage(m: SeqModel, index: number): SeqModel {
  if (index < 0 || index >= m.messages.length) return m;
  return { ...m, messages: m.messages.filter((_, i) => i !== index) };
}
