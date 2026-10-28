import type { FlowModel, Model } from "./types.ts";

export type Hit =
  | { kind: "node"; id: string }
  | { kind: "edge"; index: number }
  | { kind: "group"; id: string }
  | { kind: "party"; id: string }
  | { kind: "message"; index: number }
  | { kind: "empty" };

export type HitAttrs = {
  domId: string | null;
  et: string | null;
  id: string | null;
  order: number;
  clusterDomId: string | null;
  svgId: string | null;
};

export function edgeDomId(model: FlowModel, index: number): string {
  const e = model.edges[index];
  // Mermaid's getEdgeId gives the first edge of a pair counter 0 and the
  // n-th later duplicate counter n + 1 (0, 2, 3, ...; it skips 1).
  let same = 0;
  for (let i = 0; i < index; i++) {
    const o = model.edges[i];
    if (o.from === e.from && o.to === e.to) same++;
  }
  const k = same === 0 ? 0 : same + 1;
  return `L_${e.from}_${e.to}_${k}`;
}

export function hitFromAttrs(a: HitAttrs, model: Model): Hit {
  if (model.kind === "flowchart") {
    if (a.domId !== null) {
      const m = /-flowchart-(.+)-\d+$/.exec(a.domId);
      if (m !== null) {
        const id = m[1];
        if (model.nodes.some((n) => n.id === id)) return { kind: "node", id };
        return { kind: "empty" };
      }
    }
    if (a.et === "edge" && a.id !== null) {
      const index = model.edges.findIndex(
        (_, i) => edgeDomId(model, i) === a.id,
      );
      if (index !== -1) return { kind: "edge", index };
      return { kind: "empty" };
    }
    if (a.clusterDomId !== null && a.svgId !== null) {
      const g = model.groups.find(
        (g) => a.clusterDomId === `${a.svgId}-${g.id}`,
      );
      if (g !== undefined) return { kind: "group", id: g.id };
      return { kind: "empty" };
    }
    return { kind: "empty" };
  }

  if ((a.et === "participant" || a.et === "life-line") && a.id !== null) {
    if (model.parties.some((p) => p.id === a.id))
      return { kind: "party", id: a.id };
    return { kind: "empty" };
  }
  if (a.et === "message" && a.order >= 0 && a.order < model.messages.length) {
    return { kind: "message", index: a.order };
  }
  return { kind: "empty" };
}

export function hitFromElement(
  target: Element | null,
  svg: Element | null,
  model: Model,
): Hit {
  if (target === null || svg === null) return { kind: "empty" };
  const nodeG = target.closest("g.node");
  const etEl = target.closest("[data-et]");
  const et = etEl?.getAttribute("data-et") ?? null;
  const id = etEl?.getAttribute("data-id") ?? null;
  let order = -1;
  if (et === "message" && etEl !== null) {
    order = Array.from(svg.querySelectorAll('[data-et="message"]')).indexOf(
      etEl,
    );
  }
  const clusterDomId = target.closest("g.cluster")?.id ?? null;
  return hitFromAttrs(
    {
      domId: nodeG?.id ?? null,
      et,
      id,
      order,
      clusterDomId,
      svgId: svg.id || null,
    },
    model,
  );
}
