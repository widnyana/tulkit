"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  autoPlace,
  clipToBox,
  groupBounds,
  nextNodeId,
} from "@/lib/mermaid-editor/layout";
import { removeNode } from "@/lib/mermaid-editor/flowchart";
import { SHAPES } from "@/lib/mermaid-editor/types";
import type { EdgeStyle, FlowModel, Shape } from "@/lib/mermaid-editor/types";
import { LabelEditor } from "./LabelEditor";
import { Palette } from "./Palette";

const FALLBACK_HALF = { w: 30, h: 10 };
const DRAG_THRESHOLD = 3;

type Editing = { kind: "node" | "edge"; id: string };
type Selection = { kind: "node" | "edge"; id: string };

type DragState = {
  id: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  moved: boolean;
  pointerId: number;
};

type GroupDragState = {
  groupId: string;
  startX: number;
  startY: number;
  origins: Record<string, [number, number]>;
  moved: boolean;
  pointerId: number;
};

function clamp(v: number): number {
  return Math.max(0, Math.round(v));
}

export function FlowchartCanvas({
  model,
  onCommit,
}: {
  model: FlowModel;
  onCommit: (next: FlowModel) => void;
}) {
  const placed = useMemo(() => autoPlace(model), [model]);

  const [sizes, setSizes] = useState<Record<string, { w: number; h: number }>>(
    {},
  );
  const [dragPos, setDragPos] = useState<Record<string, [number, number]>>({});
  const [sel, setSel] = useState<Selection | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [announce, setAnnounce] = useState("");

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const groupDragRef = useRef<GroupDragState | null>(null);
  const connectRef = useRef<{ from: string } | null>(null);

  const roRef = useRef<ResizeObserver | null>(null);
  const getRo = useCallback(() => {
    if (!roRef.current && typeof ResizeObserver !== "undefined") {
      roRef.current = new ResizeObserver((entries) => {
        setSizes((prev) => {
          const next = { ...prev };
          for (const entry of entries) {
            const id = (entry.target as HTMLElement).dataset.nodeId;
            if (id)
              next[id] = {
                w: entry.contentRect.width,
                h: entry.contentRect.height,
              };
          }
          return next;
        });
      });
    }
    return roRef.current;
  }, []);
  useEffect(() => () => roRef.current?.disconnect(), []);

  const posOf = useCallback(
    (id: string): [number, number] => dragPos[id] ?? placed.pos[id] ?? [0, 0],
    [dragPos, placed],
  );

  const halfOf = useCallback(
    (id: string) => {
      const s = sizes[id];
      if (!s) return FALLBACK_HALF;
      return { w: s.w / 2, h: s.h / 2 };
    },
    [sizes],
  );

  const say = useCallback((text: string) => setAnnounce(text), []);

  const commit = useCallback(
    (next: FlowModel) => {
      setDragPos({});
      onCommit(next);
    },
    [onCommit],
  );

  const addNode = useCallback(
    (shape: Shape, center?: { x: number; y: number }) => {
      const el = canvasRef.current;
      const c = center ?? {
        x: (el?.scrollLeft ?? 0) + (el?.clientWidth ?? 600) / 2,
        y: (el?.scrollTop ?? 0) + (el?.clientHeight ?? 400) / 2,
      };
      const id = nextNodeId(placed.nodes.map((n) => n.id));
      const pos: [number, number] = [
        clamp(c.x - FALLBACK_HALF.w),
        clamp(c.y - FALLBACK_HALF.h),
      ];
      commit({
        ...placed,
        nodes: [...placed.nodes, { id, label: "Node", shape }],
        pos: { ...placed.pos, [id]: pos },
      });
      setEditing({ kind: "node", id });
      say("Node added");
    },
    [placed, commit, say],
  );

  const deleteNode = useCallback(
    (id: string) => {
      commit(removeNode(placed, id));
      setSel(null);
      setEditing(null);
      say("Deleted");
    },
    [placed, commit, say],
  );

  const deleteEdge = useCallback(
    (index: number) => {
      commit({
        ...placed,
        edges: placed.edges.filter((_, i) => i !== index),
      });
      setSel(null);
      setEditing(null);
      say("Deleted");
    },
    [placed, commit, say],
  );

  const placedWithDrag = useMemo(
    () => ({ ...placed, pos: { ...placed.pos, ...dragPos } }),
    [placed, dragPos],
  );
  const boxes = useMemo(
    () => groupBounds(placedWithDrag, sizes),
    [placedWithDrag, sizes],
  );

  // Shift everything right/down so negative positions still render on-canvas.
  const offset = useMemo(() => {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    for (const n of placed.nodes) {
      const [x, y] = posOf(n.id);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
    }
    for (const b of boxes) {
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
    }
    if (!Number.isFinite(minX)) {
      minX = 0;
      minY = 0;
    }
    return { x: Math.max(0, 16 - minX), y: Math.max(0, 16 - minY) };
  }, [placed, posOf, boxes]);

  // Content box sized to the node extent plus headroom.
  const boxSize = useMemo(() => {
    let maxRight = 0;
    let maxBottom = 0;
    for (const n of placed.nodes) {
      const [x, y] = posOf(n.id);
      const s = sizes[n.id] ?? { w: 120, h: 40 };
      maxRight = Math.max(maxRight, x + s.w);
      maxBottom = Math.max(maxBottom, y + s.h);
    }
    for (const b of boxes) {
      maxRight = Math.max(maxRight, b.x + b.w);
      maxBottom = Math.max(maxBottom, b.y + b.h);
    }
    return {
      w: Math.max(400, maxRight) + offset.x + 200,
      h: Math.max(300, maxBottom) + offset.y + 200,
    };
  }, [placed, posOf, sizes, boxes, offset]);

  const toCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const el = canvasRef.current;
      if (!el) return { x: 0, y: 0 };
      const r = el.getBoundingClientRect();
      return {
        x: clientX - r.left + el.scrollLeft - offset.x,
        y: clientY - r.top + el.scrollTop - offset.y,
      };
    },
    [offset],
  );

  const finishConnect = useCallback(
    (clientX: number, clientY: number) => {
      const from = connectRef.current?.from;
      connectRef.current = null;
      setGhost(null);
      if (!from) return;
      const pt = toCanvas(clientX, clientY);
      const el = document.elementFromPoint(clientX, clientY);
      const targetId =
        el?.closest("[data-node-id]")?.getAttribute("data-node-id") ?? null;

      if (targetId && targetId !== from) {
        if (placed.edges.some((e) => e.from === from && e.to === targetId)) {
          return;
        }
        commit({
          ...placed,
          edges: [
            ...placed.edges,
            { from, to: targetId, label: null, style: "solid" as EdgeStyle },
          ],
        });
        say("Edge added");
        return;
      }
      if (!targetId) {
        // Empty canvas: create a rect node at the drop point and connect it.
        const id = nextNodeId(placed.nodes.map((n) => n.id));
        const pos: [number, number] = [
          clamp(pt.x - FALLBACK_HALF.w),
          clamp(pt.y - FALLBACK_HALF.h),
        ];
        commit({
          ...placed,
          nodes: [
            ...placed.nodes,
            { id, label: "Node", shape: "rect" as Shape },
          ],
          edges: [
            ...placed.edges,
            { from, to: id, label: null, style: "solid" as EdgeStyle },
          ],
          pos: { ...placed.pos, [id]: pos },
        });
        setEditing({ kind: "node", id });
        say("Node added");
      }
    },
    [placed, toCanvas, commit, say],
  );

  const panRef = useRef<{
    startX: number;
    startY: number;
    left: number;
    top: number;
    moved: boolean;
    pointerId: number;
  } | null>(null);

  if (placed.nodes.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-2">
        <Palette
          onAdd={(shape) => addNode(shape)}
          onDirection={(dir) => commit({ ...placed, dir })}
          direction={placed.dir}
        />
        <div
          data-testid="flowchart-canvas"
          className="flex min-h-96 flex-1 items-center justify-center rounded-md border border-dashed border-border"
        >
          <p className="text-sm text-muted-foreground">
            Drag a shape here, or tap one in the palette.
          </p>
        </div>
        <div aria-live="polite" role="status" className="sr-only">
          {announce}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 gap-3 overflow-hidden">
      <Palette
        onAdd={(shape) => addNode(shape)}
        onDirection={(dir) => commit({ ...placed, dir })}
        direction={placed.dir}
      />
      <div
        ref={canvasRef}
        data-testid="flowchart-canvas"
        className="relative min-h-96 min-w-0 flex-1 cursor-grab overflow-auto rounded-md border border-border bg-indigo-50/40 active:cursor-grabbing dark:bg-indigo-950/30"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const t = e.target as HTMLElement;
          if (
            t.closest(
              "[data-node-id],[data-handle],[data-group-handle],input,button,[role='button]",
            )
          ) {
            return;
          }
          e.currentTarget.setPointerCapture(e.pointerId);
          panRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            left: e.currentTarget.scrollLeft,
            top: e.currentTarget.scrollTop,
            moved: false,
            pointerId: e.pointerId,
          };
        }}
        onPointerMove={(e) => {
          const p = panRef.current;
          if (!p || p.pointerId !== e.pointerId) return;
          const dx = e.clientX - p.startX;
          const dy = e.clientY - p.startY;
          if (Math.abs(dx) >= 3 || Math.abs(dy) >= 3) p.moved = true;
          e.currentTarget.scrollLeft = p.left - dx;
          e.currentTarget.scrollTop = p.top - dy;
        }}
        onPointerUp={(e) => {
          const p = panRef.current;
          panRef.current = null;
          if (p && e.currentTarget.hasPointerCapture(p.pointerId)) {
            e.currentTarget.releasePointerCapture(p.pointerId);
          }
          if (p && !p.moved) setSel(null);
        }}
        onPointerCancel={(e) => {
          const p = panRef.current;
          panRef.current = null;
          if (p && e.currentTarget.hasPointerCapture(p.pointerId)) {
            e.currentTarget.releasePointerCapture(p.pointerId);
          }
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("application/x-tulkit-shape")) {
            e.preventDefault();
          }
        }}
        onDrop={(e) => {
          const shape = e.dataTransfer.getData(
            "application/x-tulkit-shape",
          ) as Shape;
          if (!shape || !SHAPES.includes(shape)) return;
          e.preventDefault();
          addNode(shape, toCanvas(e.clientX, e.clientY));
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            if (connectRef.current) {
              connectRef.current = null;
              setGhost(null);
            }
            if (dragRef.current) {
              dragRef.current = null;
              setDragPos({});
            }
            if (groupDragRef.current) {
              groupDragRef.current = null;
              setDragPos({});
            }
          }
        }}
      >
        <div
          className="relative"
          style={{ width: boxSize.w, height: boxSize.h }}
        >
          {boxes.map((box) => (
            <div
              key={box.id}
              role="group"
              data-group-id={box.id}
              aria-label={`Group ${box.title}`}
              className="absolute rounded-lg border border-dashed border-slate-300 bg-slate-50/60 dark:border-slate-600 dark:bg-slate-900/40"
              style={{
                left: box.x + offset.x,
                top: box.y + offset.y,
                width: box.w,
                height: box.h,
              }}
            >
              <div
                data-group-handle
                className="h-6 cursor-move select-none truncate rounded-t-lg px-2 text-xs font-medium leading-6 text-slate-600 dark:text-slate-300"
                onPointerDown={(e) => {
                  if (connectRef.current) return;
                  const group = placed.groups.find((g) => g.id === box.id);
                  if (!group) return;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  const origins: Record<string, [number, number]> = {};
                  for (const m of group.members) {
                    const p = placedWithDrag.pos[m];
                    if (p) origins[m] = [p[0], p[1]];
                  }
                  groupDragRef.current = {
                    groupId: box.id,
                    startX: e.clientX,
                    startY: e.clientY,
                    origins,
                    moved: false,
                    pointerId: e.pointerId,
                  };
                }}
                onPointerMove={(e) => {
                  const gd = groupDragRef.current;
                  if (!gd || gd.groupId !== box.id) return;
                  const dx = e.clientX - gd.startX;
                  const dy = e.clientY - gd.startY;
                  if (!gd.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
                  gd.moved = true;
                  const next: Record<string, [number, number]> = {};
                  for (const [id, [ox, oy]] of Object.entries(gd.origins)) {
                    next[id] = [clamp(ox + dx), clamp(oy + dy)];
                  }
                  setDragPos(next);
                }}
                onPointerUp={(e) => {
                  const gd = groupDragRef.current;
                  if (!gd || gd.groupId !== box.id) return;
                  groupDragRef.current = null;
                  e.currentTarget.releasePointerCapture(gd.pointerId);
                  if (!gd.moved) return;
                  const pos = { ...placed.pos };
                  for (const [id, [ox, oy]] of Object.entries(gd.origins)) {
                    const p = dragPos[id] ?? [ox, oy];
                    pos[id] = [clamp(p[0]), clamp(p[1])];
                  }
                  commit({ ...placed, pos });
                }}
              >
                {box.title}
              </div>
            </div>
          ))}

          <svg
            className="pointer-events-none absolute inset-0 text-indigo-600 dark:text-indigo-300"
            width={boxSize.w}
            height={boxSize.h}
          >
            <defs>
              <marker
                id="tulkit-flow-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
              </marker>
            </defs>
            {ghost && connectRef.current && (
              <line
                x1={
                  posOf(connectRef.current.from)[0] + FALLBACK_HALF.w + offset.x
                }
                y1={
                  posOf(connectRef.current.from)[1] + FALLBACK_HALF.h + offset.y
                }
                x2={ghost.x + offset.x}
                y2={ghost.y + offset.y}
                stroke="currentColor"
                strokeDasharray="4 4"
              />
            )}
            {placed.edges.map((edge, i) => {
              const a = posOf(edge.from);
              const b = posOf(edge.to);
              const ha = halfOf(edge.from);
              const hb = halfOf(edge.to);
              const start = clipToBox(
                { x: b[0] + hb.w, y: b[1] + hb.h },
                { x: a[0] + ha.w, y: a[1] + ha.h },
                ha.w,
                ha.h,
              );
              const end = clipToBox(
                { x: a[0] + ha.w, y: a[1] + ha.h },
                { x: b[0] + hb.w, y: b[1] + hb.h },
                hb.w,
                hb.h,
              );
              const mid = {
                x: (start.x + end.x) / 2,
                y: (start.y + end.y) / 2,
              };
              const selected = sel?.kind === "edge" && sel.id === String(i);
              const width = edge.style === "thick" ? 3 : 1.5;
              const selfLoop = edge.from === edge.to;
              const loopX = b[0] + hb.w + offset.x;
              const loopY = b[1] + hb.h + offset.y;
              const d = selfLoop
                ? `M ${loopX} ${loopY - 6} C ${loopX + 40} ${loopY - 30}, ${loopX + 40} ${loopY + 30}, ${loopX} ${loopY + 6}`
                : undefined;
              const visibleAttrs = {
                stroke: "currentColor",
                strokeWidth: width,
                markerEnd: "url(#tulkit-flow-arrow)",
                ...(edge.style === "dotted" ? { strokeDasharray: "4 4" } : {}),
              };
              return (
                <g
                  key={`${edge.from}-${edge.to}`}
                  role="button"
                  tabIndex={0}
                  data-edge-id={i}
                  aria-label={`Edge ${edge.from} to ${edge.to}${edge.label ? `, ${edge.label}` : ""}`}
                  className={`pointer-events-auto cursor-pointer ${selected ? "ring-2 ring-ring" : ""}`}
                  onClick={() => setSel({ kind: "edge", id: String(i) })}
                  onDoubleClick={() =>
                    setEditing({ kind: "edge", id: String(i) })
                  }
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setEditing({ kind: "edge", id: String(i) });
                    } else if (e.key === "Delete" || e.key === "Backspace") {
                      e.preventDefault();
                      deleteEdge(i);
                    }
                  }}
                >
                  {selfLoop ? (
                    <>
                      <path d={d} fill="none" {...visibleAttrs} />
                      <path
                        d={d}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={12}
                        style={{ pointerEvents: "stroke" }}
                      />
                    </>
                  ) : (
                    <>
                      <line
                        x1={start.x + offset.x}
                        y1={start.y + offset.y}
                        x2={end.x + offset.x}
                        y2={end.y + offset.y}
                        {...visibleAttrs}
                      />
                      <line
                        x1={start.x + offset.x}
                        y1={start.y + offset.y}
                        x2={end.x + offset.x}
                        y2={end.y + offset.y}
                        stroke="transparent"
                        strokeWidth={12}
                        style={{ pointerEvents: "stroke" }}
                      />
                      {edge.label && (
                        <>
                          <rect
                            x={mid.x - edge.label.length * 3.2 - 3 + offset.x}
                            y={mid.y - 8 + offset.y}
                            width={edge.label.length * 6.4 + 6}
                            height={16}
                            className="fill-background"
                          />
                          <text
                            x={mid.x + offset.x}
                            y={mid.y + 4 + offset.y}
                            textAnchor="middle"
                            className="fill-current text-[10px]"
                          >
                            {edge.label}
                          </text>
                        </>
                      )}
                    </>
                  )}
                  {selfLoop && edge.label && (
                    <text
                      x={loopX + 40}
                      y={loopY}
                      textAnchor="middle"
                      className="fill-current text-[10px]"
                    >
                      {edge.label}
                    </text>
                  )}
                  {editing?.kind === "edge" && editing.id === String(i) && (
                    <foreignObject
                      x={mid.x - 45 + offset.x}
                      y={mid.y - 10 + offset.y}
                      width={90}
                      height={20}
                    >
                      <LabelEditor
                        value={edge.label ?? ""}
                        x={0}
                        y={0}
                        width={88}
                        onCommit={(text) => {
                          setEditing(null);
                          commit({
                            ...placed,
                            edges: placed.edges.map((ed, j) =>
                              j === i
                                ? { ...ed, label: text.trim() || null }
                                : ed,
                            ),
                          });
                        }}
                        onCancel={() => setEditing(null)}
                      />
                    </foreignObject>
                  )}
                </g>
              );
            })}
          </svg>

          {placed.nodes.map((node) => {
            const [x, y] = posOf(node.id);
            const selected = sel?.kind === "node" && sel.id === node.id;
            const dragging = dragPos[node.id] !== undefined;
            const bodyClass: Record<Shape, string> = {
              rect: "rounded-sm",
              round: "rounded-xl",
              diamond: "",
              circle: "h-14 w-14 rounded-full",
              stadium: "rounded-full px-4",
              cylinder: "rounded-[50%/12px]",
              hexagon:
                "[clip-path:polygon(12%_0,88%_0,100%_50%,88%_100%,12%_100%,0_50%)] px-6",
            };
            const common =
              "flex items-center justify-center border bg-indigo-50 border-indigo-400 text-indigo-950 dark:bg-indigo-950 dark:border-indigo-400 dark:text-indigo-100 transition-colors";
            return (
              <div
                key={node.id}
                role="button"
                tabIndex={0}
                data-node-id={node.id}
                aria-label={`Node ${node.label}, ${node.shape}`}
                ref={(el) => {
                  const ro = getRo();
                  if (el && ro) {
                    ro.observe(el);
                    return () => ro.unobserve(el);
                  }
                  return undefined;
                }}
                className={`absolute select-none px-3 py-1 text-xs ${common} ${bodyClass[node.shape]} ${
                  selected ? "ring-2 ring-ring" : ""
                } ${node.shape === "diamond" ? "h-14 w-20" : "min-w-[60px] min-h-[20px]"} ${
                  dragging ? "z-10" : ""
                } ${node.shape === "diamond" ? "[clip-path:polygon(50%_0,100%_50%,50%_100%,0_50%)]" : ""}`}
                style={{ left: x + offset.x, top: y + offset.y }}
                onPointerDown={(e) => {
                  if (connectRef.current) return;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  dragRef.current = {
                    id: node.id,
                    startX: e.clientX,
                    startY: e.clientY,
                    origX: x,
                    origY: y,
                    moved: false,
                    pointerId: e.pointerId,
                  };
                }}
                onPointerMove={(e) => {
                  const d = dragRef.current;
                  if (!d || d.id !== node.id) return;
                  const dx = e.clientX - d.startX;
                  const dy = e.clientY - d.startY;
                  if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
                  d.moved = true;
                  setDragPos({
                    [node.id]: [clamp(d.origX + dx), clamp(d.origY + dy)],
                  });
                }}
                onPointerUp={(e) => {
                  const d = dragRef.current;
                  if (!d || d.id !== node.id) return;
                  dragRef.current = null;
                  if (d.moved) {
                    const p = dragPos[node.id] ?? [d.origX, d.origY];
                    const half = halfOf(node.id);
                    const cx = p[0] + half.w;
                    const cy = p[1] + half.h;
                    const posNoNode = { ...placedWithDrag.pos };
                    delete posNoNode[node.id];
                    const boxesNoNode = groupBounds(
                      { ...placedWithDrag, pos: posNoNode },
                      sizes,
                    );
                    const hit = boxesNoNode.find(
                      (b) =>
                        cx >= b.x &&
                        cx <= b.x + b.w &&
                        cy >= b.y &&
                        cy <= b.y + b.h,
                    );
                    let groups = placed.groups.map((g) => ({
                      ...g,
                      members: g.members.filter((m) => m !== node.id),
                    }));
                    if (hit) {
                      groups = groups.map((g) =>
                        g.id === hit.id
                          ? { ...g, members: [...g.members, node.id] }
                          : g,
                      );
                    }
                    commit({
                      ...placed,
                      pos: { ...placed.pos, [node.id]: [p[0], p[1]] },
                      groups,
                    });
                  } else {
                    setSel({ kind: "node", id: node.id });
                  }
                  e.currentTarget.releasePointerCapture(d.pointerId);
                }}
                onDoubleClick={() => setEditing({ kind: "node", id: node.id })}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setEditing({ kind: "node", id: node.id });
                    return;
                  }
                  if (e.key === "Delete" || e.key === "Backspace") {
                    e.preventDefault();
                    deleteNode(node.id);
                    return;
                  }
                  const step = e.shiftKey ? 50 : 10;
                  const map: Record<string, [number, number]> = {
                    ArrowLeft: [-step, 0],
                    ArrowRight: [step, 0],
                    ArrowUp: [0, -step],
                    ArrowDown: [0, step],
                  };
                  const delta = map[e.key];
                  if (delta) {
                    e.preventDefault();
                    const p = posOf(node.id);
                    commit({
                      ...placed,
                      pos: {
                        ...placed.pos,
                        [node.id]: [
                          clamp(p[0] + delta[0]),
                          clamp(p[1] + delta[1]),
                        ],
                      },
                    });
                    return;
                  }
                  setSel({ kind: "node", id: node.id });
                }}
              >
                <span
                  className={
                    node.shape === "diamond"
                      ? "pointer-events-none max-w-14 text-center leading-tight"
                      : "pointer-events-none max-w-full truncate leading-tight"
                  }
                >
                  {node.label}
                </span>
                <span
                  data-handle
                  aria-hidden
                  className="absolute -bottom-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 cursor-crosshair rounded-full border border-indigo-400 bg-indigo-950 dark:bg-indigo-100"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    connectRef.current = { from: node.id };
                    setGhost({
                      x: x + FALLBACK_HALF.w,
                      y: y + FALLBACK_HALF.h,
                    });
                  }}
                  onPointerMove={(e) => {
                    if (!connectRef.current) return;
                    setGhost(toCanvas(e.clientX, e.clientY));
                  }}
                  onPointerUp={(e) => {
                    if (!connectRef.current) return;
                    finishConnect(e.clientX, e.clientY);
                  }}
                />
              </div>
            );
          })}

          {editing?.kind === "node" && (
            <LabelEditor
              value={placed.nodes.find((n) => n.id === editing.id)?.label ?? ""}
              x={posOf(editing.id)[0] + offset.x}
              y={posOf(editing.id)[1] + offset.y}
              width={88}
              onCommit={(text) => {
                const trimmed = text.trim();
                setEditing(null);
                if (!trimmed) return;
                commit({
                  ...placed,
                  nodes: placed.nodes.map((n) =>
                    n.id === editing.id ? { ...n, label: trimmed } : n,
                  ),
                });
              }}
              onCancel={() => setEditing(null)}
            />
          )}
        </div>
      </div>
      <div aria-live="polite" role="status" className="sr-only">
        {announce}
      </div>
    </div>
  );
}
