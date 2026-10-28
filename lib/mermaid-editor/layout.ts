import type { FlowModel } from "./types.ts";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const GAP_MAIN = 120;
const GAP_CROSS = 180;
const ORIGIN = 40;

export function nextNodeId(existing: Iterable<string>): string {
  const used = new Set(existing);
  for (const letter of LETTERS) {
    if (letter !== "end" && !used.has(letter)) return letter;
  }
  for (let n = 1; ; n++) {
    const candidate = `N${n}`;
    if (candidate !== "end" && !used.has(candidate)) return candidate;
  }
}

// ponytail: BFS ranks, no crossing minimization; no group-aware packing; upgrade path is a Sugiyama pass
// (or dagre) if users ask for tidy auto-layout. The real render is mermaid's
// own layout anyway; the canvas layout only has to be usable.
export function autoPlace(model: FlowModel): FlowModel {
  const missing = model.nodes.filter((n) => !(n.id in model.pos));
  if (missing.length === 0) return model;

  const placed: Record<string, [number, number]> = { ...model.pos };
  const order = missing.map((n) => n.id);
  const ids = new Set(order);
  const hasIncoming = new Set(
    model.edges
      .filter((e) => ids.has(e.from) && ids.has(e.to))
      .map((e) => e.to),
  );
  let roots = order.filter((id) => !hasIncoming.has(id));
  if (roots.length === 0) roots = [order[0]];

  const rank = new Map<string, number>();
  const visited = new Set<string>();
  const queue: string[] = [];
  const enqueueRoot = (id: string) => {
    rank.set(id, 0);
    visited.add(id);
    queue.push(id);
  };
  for (const root of roots) enqueueRoot(root);

  while (visited.size < order.length) {
    while (queue.length > 0) {
      const node = queue.shift() as string;
      const r = rank.get(node) as number;
      for (const edge of model.edges) {
        if (edge.from !== node) continue;
        if (!ids.has(edge.to) || visited.has(edge.to)) continue;
        visited.add(edge.to);
        rank.set(edge.to, r + 1);
        queue.push(edge.to);
      }
    }
    const next = order.find((id) => !visited.has(id));
    if (next === undefined) break;
    enqueueRoot(next);
  }

  const byRank = new Map<number, string[]>();
  for (const id of order) {
    const r = rank.get(id) as number;
    if (!byRank.has(r)) byRank.set(r, []);
    (byRank.get(r) as string[]).push(id);
  }

  const groupIndex = new Map<string, number>();
  model.groups.forEach((g, i) => {
    for (const m of g.members) groupIndex.set(m, i);
  });
  for (const [, idsInRank] of byRank) {
    idsInRank.sort((a, b) => {
      const ga = groupIndex.get(a);
      const gb = groupIndex.get(b);
      if (ga !== gb) {
        if (ga === undefined) return 1;
        if (gb === undefined) return -1;
        return ga - gb;
      }
      return order.indexOf(a) - order.indexOf(b);
    });
  }

  const occupied = new Set(Object.values(placed).map(([x, y]) => `${x},${y}`));
  const vertical =
    model.dir === "TD" || model.dir === "TB" || model.dir === "BT";

  for (const [r, idsInRank] of [...byRank.entries()].sort(
    (a, b) => a[0] - b[0],
  )) {
    idsInRank.forEach((id, col) => {
      let x: number;
      let y: number;
      if (vertical) {
        x = ORIGIN + col * GAP_CROSS;
        y = ORIGIN + r * GAP_MAIN;
        if (model.dir === "BT") y = -y;
      } else {
        x = ORIGIN + r * GAP_MAIN;
        y = ORIGIN + col * GAP_CROSS;
        if (model.dir === "RL") x = -x;
      }
      const key = () => `${x},${y}`;
      if (!occupied.has(key())) {
        occupied.add(key());
        placed[id] = [x, y];
        return;
      }
      for (let step = 1; ; step++) {
        const nx = vertical ? x + step * GAP_CROSS : x;
        const ny = vertical ? y : y + step * GAP_CROSS;
        if (!occupied.has(`${nx},${ny}`)) {
          occupied.add(`${nx},${ny}`);
          placed[id] = [nx, ny];
          break;
        }
      }
    });
  }

  return { ...model, pos: placed };
}

export function groupBounds(
  model: FlowModel,
  sizes: Record<string, { w: number; h: number }>,
  pad = 24,
): Array<{
  id: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
}> {
  const result: Array<{
    id: string;
    title: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }> = [];
  for (const group of model.groups) {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const member of group.members) {
      const pos = model.pos[member];
      if (!pos) continue;
      const size = sizes[member] ?? { w: 120, h: 40 };
      minX = Math.min(minX, pos[0]);
      minY = Math.min(minY, pos[1]);
      maxX = Math.max(maxX, pos[0] + size.w);
      maxY = Math.max(maxY, pos[1] + size.h);
    }
    if (!Number.isFinite(minX)) continue;
    result.push({
      id: group.id,
      title: group.title,
      x: minX - pad,
      y: minY - pad - 24,
      w: maxX - minX + pad * 2,
      h: maxY - minY + pad * 2 + 24,
    });
  }
  return result;
}

export function clipToBox(
  from: { x: number; y: number },
  to: { x: number; y: number },
  halfW: number,
  halfH: number,
): { x: number; y: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return { x: to.x, y: to.y };
  const tx = dx === 0 ? Number.POSITIVE_INFINITY : halfW / Math.abs(dx);
  const ty = dy === 0 ? Number.POSITIVE_INFINITY : halfH / Math.abs(dy);
  const t = Math.min(tx, ty);
  return { x: to.x - dx * t, y: to.y - dy * t };
}
