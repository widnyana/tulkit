"use client";

import type { FlowModel, Shape } from "@/lib/mermaid-editor/types";
import { parseAny, serialize } from "@/lib/mermaid-editor";
import { LabelEditor } from "./LabelEditor";
import { Palette } from "./Palette";
import {
  addNode,
  connect,
  removeEdge,
  renameEdge,
  renameGroup,
  renameNode,
} from "@/lib/mermaid-editor/edit";
import { removeNode } from "@/lib/mermaid-editor/flowchart";
import { edgeDomId, hitFromElement, type Hit } from "@/lib/mermaid-editor/hit";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type {
  DragEvent as ReactDragEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";

const SHAPE_MIME = "application/x-tulkit-shape";

type LabelTarget = {
  kind: "node" | "edge" | "group";
  id: string;
  index?: number;
  value: string;
  x: number;
  y: number;
  width: number;
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function usePreviewEditor(opts: {
  code: string;
  enabled: boolean;
  svgHost: RefObject<HTMLDivElement | null>;
  box: RefObject<HTMLElement | null>;
  renderTick: number;
  onCommit: (nextCode: string) => void;
}): {
  model: FlowModel | null;
  reason: string | null;
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => boolean;
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => boolean;
  onPointerUp: (e: ReactPointerEvent<HTMLElement>) => boolean;
  boxProps: {
    onDoubleClick: (e: React.MouseEvent<HTMLElement>) => void;
    onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => void;
    onDragOver: (e: ReactDragEvent<HTMLElement>) => void;
    onDrop: (e: ReactDragEvent<HTMLElement>) => void;
  };
  overlay: ReactNode;
} {
  const { code, enabled, svgHost, box, renderTick, onCommit } = opts;
  const parsed = useMemo(() => parseAny(code), [code]);
  const model: FlowModel | null =
    parsed.ok && parsed.model.kind === "flowchart" ? parsed.model : null;
  const reason: string | null = parsed.ok
    ? parsed.model.kind === "flowchart"
      ? null
      : "Preview editing is not available for this diagram type yet."
    : parsed.reason;

  const active = enabled && model !== null;
  const [sel, setSel] = useState<Hit | null>(null);
  const [label, setLabel] = useState<LabelTarget | null>(null);
  const [ghost, setGhost] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const [pendingEdit, setPendingEdit] = useState<string | null>(null);
  const dragConn = useRef<{
    from: string;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const ghostCancelled = useRef(false);

  const commit = useCallback(
    (m: FlowModel) => {
      onCommit(serialize(m));
      setSel(null);
    },
    [onCommit],
  );

  const boxPoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = box.current?.getBoundingClientRect();
      return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
    },
    [box],
  );

  const hitAt = useCallback(
    (target: Element | null) =>
      model
        ? hitFromElement(
            target,
            svgHost.current?.querySelector("svg") ?? null,
            model,
          )
        : null,
    [model, svgHost],
  );

  const svgNode = useCallback(
    (id: string) =>
      Array.from(svgHost.current?.querySelectorAll("g.node") ?? []).find((g) =>
        new RegExp(`-flowchart-${escapeRegex(id)}-\\d+$`).test(g.id),
      ),
    [svgHost],
  );

  const selectedElement = useCallback(
    (model2: FlowModel, s: Hit): Element | null => {
      const svg = svgHost.current?.querySelector("svg");
      if (!svg) return null;
      if (s.kind === "node") return svgNode(s.id) ?? null;
      if (s.kind === "edge")
        return svg.querySelector(
          `[data-et="edge"][data-id="${edgeDomId(model2, s.index)}"]`,
        );
      if (s.kind === "group")
        return svg.querySelector(`g.cluster[id$="-${s.id}"]`);
      return null;
    },
    [svgHost, svgNode],
  );

  // Selection highlight: clear then set after each render.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-runs on each successful render
  useEffect(() => {
    const svg = svgHost.current?.querySelector("svg");
    if (!svg) return;
    for (const el of svg.querySelectorAll("[data-tulkit-selected]"))
      el.removeAttribute("data-tulkit-selected");
    if (!active || !sel || !model) return;
    const el = selectedElement(model, sel);
    el?.setAttribute("data-tulkit-selected", "");
  }, [renderTick, sel, active, model, selectedElement, svgHost]);

  // Open the label editor for a node just added.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-runs on each successful render
  useEffect(() => {
    if (!pendingEdit || !active) return;
    const g = svgNode(pendingEdit);
    if (!g) return;
    setPendingEdit(null);
    const rect = g.getBoundingClientRect();
    const brect = box.current?.getBoundingClientRect();
    if (!brect) return;
    setLabel({
      kind: "node",
      id: pendingEdit,
      value: "Node",
      x: rect.left - brect.left,
      y: rect.top - brect.top,
      width: Math.max(96, rect.width),
    });
  }, [renderTick, pendingEdit, active, svgNode, box]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!active || !model) return false;
      if (e.button !== 0) return false;
      let target = e.target as Element | null;
      let hit = hitAt(target);
      if (!hit || hit.kind === "empty") {
        target = document.elementFromPoint(e.clientX, e.clientY);
        hit = hitAt(target);
      }
      if (hit?.kind === "node") {
        e.currentTarget.setPointerCapture(e.pointerId);
        // Take focus so Delete/Escape keyboard gestures reach this handler.
        e.currentTarget.focus({ preventScroll: true });
        dragConn.current = {
          from: hit.id,
          startX: e.clientX,
          startY: e.clientY,
          moved: false,
        };
        ghostCancelled.current = false;
        return true;
      }
      if (hit?.kind === "edge" || hit?.kind === "group") {
        setSel(hit);
        e.currentTarget.focus({ preventScroll: true });
        return true;
      }
      setSel(null);
      return false;
    },
    [active, model, hitAt],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const d = dragConn.current;
      if (!active || !d) return false;
      if (
        !d.moved &&
        Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 3
      )
        return true;
      const svg = svgHost.current?.querySelector("svg");
      const g = svgNode(d.from);
      if (!g || !svg) return true;
      const rect = g.getBoundingClientRect();
      const start = boxPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      );
      const cur = boxPoint(e.clientX, e.clientY);
      d.moved = true;
      if (!ghostCancelled.current)
        setGhost({ x1: start.x, y1: start.y, x2: cur.x, y2: cur.y });
      return true;
    },
    [active, svgHost, svgNode, boxPoint],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const d = dragConn.current;
      setGhost(null);
      dragConn.current = null;
      if (!active || !model || !d) return false;
      if (!d.moved) {
        setSel({ kind: "node", id: d.from });
        return true;
      }
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const hit = hitAt(target);
      if (hit?.kind === "node" && hit.id !== d.from) {
        commit(connect(model, d.from, hit.id));
      } else if (!hit || hit.kind === "empty") {
        const added = addNode(model, "rect", { from: d.from });
        commit(added.model);
        setPendingEdit(added.id);
      }
      return true;
    },
    [active, model, hitAt, commit],
  );

  const onDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!active || !model) return;
      // Pointer capture retargets the click/dblclick to the section, so hit
      // test the real element under the pointer instead of e.target.
      const at = document.elementFromPoint(e.clientX, e.clientY);
      const hit = hitAt(at);
      if (!hit || hit.kind === "empty" || !at) return;
      const el =
        hit.kind === "node"
          ? at.closest("g.node")
          : hit.kind === "group"
            ? at.closest("g.cluster")
            : hit.kind === "edge"
              ? svgHost.current?.querySelector(
                  `[data-et="edge"][data-id="${edgeDomId(model, hit.index)}"]`,
                )
              : null;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const brect = box.current?.getBoundingClientRect();
      if (!brect) return;
      const p = boxPoint(rect.left, rect.top);
      if (hit.kind === "node") {
        const node = model.nodes.find((n) => n.id === hit.id);
        if (!node) return;
        setLabel({
          kind: "node",
          id: hit.id,
          value: node.label,
          x: p.x,
          y: p.y,
          width: Math.max(96, rect.width),
        });
      } else if (hit.kind === "edge") {
        setLabel({
          kind: "edge",
          id: String(hit.index),
          index: hit.index,
          value: model.edges[hit.index]?.label ?? "",
          x: p.x,
          y: p.y,
          width: Math.max(96, rect.width),
        });
      } else if (hit.kind === "group") {
        const grp = model.groups.find((g) => g.id === hit.id);
        if (!grp) return;
        setLabel({
          kind: "group",
          id: hit.id,
          value: grp.title,
          x: p.x,
          y: p.y,
          width: Math.max(96, rect.width),
        });
      }
    },
    [active, model, hitAt, svgHost, box, boxPoint],
  );

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLElement>) => {
      if (!active || !model) return;
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      if (e.key === "Escape") {
        if (dragConn.current) {
          ghostCancelled.current = true;
          setGhost(null);
          dragConn.current = null;
          return;
        }
        setSel(null);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && sel) {
        e.preventDefault();
        if (sel.kind === "node") commit(removeNode(model, sel.id));
        else if (sel.kind === "edge") commit(removeEdge(model, sel.index));
      }
    },
    [active, model, sel, commit],
  );

  const onDragOver = useCallback(
    (e: ReactDragEvent<HTMLElement>) => {
      if (!active) return;
      if (e.dataTransfer.types.includes(SHAPE_MIME)) e.preventDefault();
    },
    [active],
  );

  const onDrop = useCallback(
    (e: ReactDragEvent<HTMLElement>) => {
      if (!active || !model) return;
      const shape = e.dataTransfer.getData(SHAPE_MIME) as Shape | "";
      if (!shape) return;
      e.preventDefault();
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const hit = hitAt(target);
      if (hit?.kind === "node") {
        const added = addNode(model, shape, { from: hit.id });
        commit(added.model);
        setPendingEdit(added.id);
      } else if (hit?.kind === "group") {
        const added = addNode(model, shape, { group: hit.id });
        commit(added.model);
        setPendingEdit(added.id);
      } else {
        const added = addNode(model, shape);
        commit(added.model);
        setPendingEdit(added.id);
      }
    },
    [active, model, hitAt, commit],
  );

  const onAdd = useCallback(
    (shape: Shape) => {
      if (!model) return;
      const added = addNode(model, shape);
      commit(added.model);
      setPendingEdit(added.id);
    },
    [model, commit],
  );

  const onDirection = useCallback(
    (dir: FlowModel["dir"]) => {
      if (!model) return;
      commit({ ...model, dir });
    },
    [model, commit],
  );

  const onLabelCommit = useCallback(
    (text: string) => {
      const l = label;
      setLabel(null);
      if (!l || !model) return;
      if (l.kind === "node") {
        const node = model.nodes.find((n) => n.id === l.id);
        if (node && node.label !== text) commit(renameNode(model, l.id, text));
      } else if (l.kind === "edge" && l.index !== undefined) {
        const edge = model.edges[l.index];
        if (edge && edge.label !== text)
          commit(renameEdge(model, l.index, text));
      } else if (l.kind === "group") {
        const grp = model.groups.find((g) => g.id === l.id);
        if (grp && grp.title !== text) commit(renameGroup(model, l.id, text));
      }
    },
    [label, model, commit],
  );

  const overlay: ReactNode = !active ? null : (
    <>
      {ghost && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          <line
            x1={ghost.x1}
            y1={ghost.y1}
            x2={ghost.x2}
            y2={ghost.y2}
            stroke="currentColor"
            strokeDasharray="4 3"
            className="text-indigo-500"
          />
        </svg>
      )}
      <div
        className="absolute bottom-2 right-2 z-10 rounded-md border border-border bg-card/95 p-2 shadow"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Palette
          kind="flow"
          onAdd={onAdd}
          direction={model?.dir}
          onDirection={onDirection}
        />
      </div>
      {label && (
        <LabelEditor
          value={label.value}
          x={label.x}
          y={label.y}
          width={label.width}
          onCommit={onLabelCommit}
          onCancel={() => setLabel(null)}
        />
      )}
    </>
  );

  return {
    model,
    reason,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    boxProps: { onDoubleClick, onKeyDown, onDragOver, onDrop },
    overlay,
  };
}
