"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { LabelEditor } from "./LabelEditor";
import { Palette } from "./Palette";
import { ARROWS } from "@/lib/mermaid-editor/types";
import type { Arrow, SeqModel } from "@/lib/mermaid-editor/types";

const COL_W = 160;
const ROW_H = 44;
const HEADER_H = 48;
const DRAG_THRESHOLD = 3;
const ARROW_COLOR = "#6366f1";

type Sel = { kind: "party"; id: string } | { kind: "msg"; index: number };
type Editing = { kind: "party"; id: string } | { kind: "msg"; index: number };

const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(Math.max(v, lo), hi);

const colX = (i: number): number => i * COL_W + COL_W / 2;
const rowY = (i: number): number => HEADER_H + i * ROW_H;

function move<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function nextPartyId(parties: SeqModel["parties"]): string {
  const used = new Set(parties.map((p) => p.id));
  for (let i = 1; ; i++) {
    if (!used.has(`P${i}`)) return `P${i}`;
  }
}

const isDashed = (a: Arrow): boolean =>
  a === "-->>" || a === "-->" || a === "--x";

function arrowMarker(a: Arrow): string {
  if (a === "->>" || a === "-->>") return "url(#sc-marker-filled)";
  if (a === "-x" || a === "--x") return "url(#sc-marker-x)";
  return "url(#sc-marker-open)";
}

function displayName(p: { id: string; label: string | null }): string {
  return p.label ?? p.id;
}

export function SequenceCanvas({
  model,
  onCommit,
}: {
  model: SeqModel;
  onCommit: (next: SeqModel) => void;
}) {
  const [sel, setSel] = useState<Sel | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [announce, setAnnounce] = useState("");
  const [ghost, setGhost] = useState<{
    fromCol: number;
    sx: number;
    sy: number;
    x: number;
    y: number;
  } | null>(null);
  const [hdrTarget, setHdrTarget] = useState<number | null>(null);
  const [rowTarget, setRowTarget] = useState<number | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<{
    moved: boolean;
    sx: number;
    sy: number;
    fromCol: number;
  } | null>(null);
  const hdrDrag = useRef<{
    index: number;
    startX: number;
    moved: boolean;
    target: number;
  } | null>(null);
  const rowDrag = useRef<{
    index: number;
    startY: number;
    moved: boolean;
    target: number;
  } | null>(null);
  const panRef = useRef<{
    startX: number;
    startY: number;
    left: number;
    top: number;
    moved: boolean;
    pointerId: number;
  } | null>(null);
  const panFrom = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return false;
    const t = e.target as HTMLElement;
    if (
      t.closest(
        "[data-party-id],input,button,[role='button'],[data-reorder-grip]",
      )
    ) {
      return false;
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
    return true;
  }, []);

  const { parties, messages } = model;

  const commit = useCallback(
    (next: SeqModel) => {
      onCommit(next);
    },
    [onCommit],
  );

  const canvasPoint = (e: {
    clientX: number;
    clientY: number;
  }): [number, number] => {
    const el = canvasRef.current;
    const r = el?.getBoundingClientRect();
    return [
      e.clientX - (r?.left ?? 0) + (el?.scrollLeft ?? 0),
      e.clientY - (r?.top ?? 0) + (el?.scrollTop ?? 0),
    ];
  };

  const addParty = useCallback(
    (actor: boolean, at?: number) => {
      const id = nextPartyId(parties);
      const party = { id, label: null, actor };
      const idx = clamp(at ?? parties.length, 0, parties.length);
      const nextParties = [...parties];
      nextParties.splice(idx, 0, party);
      commit({ ...model, parties: nextParties });
      setEditing({ kind: "party", id });
      setAnnounce("Participant added");
    },
    [commit, model, parties],
  );

  const removeParty = useCallback(
    (id: string) => {
      commit({
        ...model,
        parties: parties.filter((p) => p.id !== id),
        messages: messages.filter((m) => m.from !== id && m.to !== id),
      });
      setSel(null);
      setAnnounce("Deleted");
    },
    [commit, messages, model, parties],
  );

  const removeMessage = useCallback(
    (index: number) => {
      commit({ ...model, messages: messages.filter((_, i) => i !== index) });
      setSel(null);
      setAnnounce("Deleted");
    },
    [commit, messages, model],
  );

  const cycleArrow = useCallback(
    (index: number) => {
      const msg = messages[index];
      if (!msg) return;
      const nextArrow = ARROWS[(ARROWS.indexOf(msg.arrow) + 1) % ARROWS.length];
      const next = [...messages];
      next[index] = { ...msg, arrow: nextArrow };
      commit({ ...model, messages: next });
    },
    [commit, messages, model],
  );

  const moveParty = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      commit({ ...model, parties: move(parties, from, to) });
    },
    [commit, model, parties],
  );

  const moveMessage = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      commit({ ...model, messages: move(messages, from, to) });
    },
    [commit, messages, model],
  );

  // Ghost arrow lifecycle, attached to the content area.
  const onContentPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!parties.length) return;
    const target = e.target as Element;
    if (target.closest("[data-no-ghost]")) return;
    const [x, y] = canvasPoint(e);
    ghostRef.current = {
      moved: false,
      sx: x,
      sy: y,
      fromCol: clamp(Math.floor(x / COL_W), 0, parties.length - 1),
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onContentPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = ghostRef.current;
    if (!g) return;
    const [x, y] = canvasPoint(e);
    if (!g.moved && Math.hypot(x - g.sx, y - g.sy) < DRAG_THRESHOLD) return;
    g.moved = true;
    setGhost({ fromCol: g.fromCol, sx: g.sx, sy: g.sy, x, y });
  };

  const onContentPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = ghostRef.current;
    ghostRef.current = null;
    setGhost(null);
    if (!g) return;
    const [x] = canvasPoint(e);
    if (!g.moved) {
      // Plain click: select the row under the pointer, if any.
      const rowIdx = clamp(
        Math.floor((g.sy - HEADER_H) / ROW_H),
        0,
        messages.length - 1,
      );
      if (g.sy >= HEADER_H && rowY(rowIdx) + ROW_H > g.sy) {
        setSel({ kind: "msg", index: rowIdx });
      } else {
        setSel(null);
      }
      return;
    }
    if (!parties.length) return;
    const toCol = clamp(Math.floor(x / COL_W), 0, parties.length - 1);
    const index = clamp(
      Math.floor((g.sy - HEADER_H) / ROW_H),
      0,
      messages.length,
    );
    const next = [...messages];
    next.splice(index, 0, {
      from: parties[g.fromCol].id,
      to: parties[toCol].id,
      arrow: "->>",
      text: "message",
    });
    commit({ ...model, messages: next });
    setEditing({ kind: "msg", index });
    setAnnounce("Message added");
  };

  // Esc cancels an in-flight ghost drag.
  useEffect(() => {
    if (!ghost) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        ghostRef.current = null;
        setGhost(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ghost]);

  const width = Math.max(parties.length * COL_W, 320);
  const height = Math.max(HEADER_H + messages.length * ROW_H + 120, 240);

  const editingParty =
    editing?.kind === "party"
      ? parties.find((p) => p.id === editing.id)
      : undefined;
  const editingPartyIdx = editingParty
    ? parties.findIndex((p) => p.id === editingParty.id)
    : -1;

  const content = (
    <div
      className="relative select-none"
      style={{ width, height, minWidth: "100%" }}
      onPointerDown={onContentPointerDown}
      onPointerMove={onContentPointerMove}
      onPointerUp={onContentPointerUp}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("application/x-tulkit-party")) {
          e.preventDefault();
        }
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.getData("application/x-tulkit-party")) return;
        e.preventDefault();
        const [x] = canvasPoint(e);
        addParty(
          e.dataTransfer.getData("application/x-tulkit-party") === "actor",
          clamp(Math.floor(x / COL_W), 0, parties.length),
        );
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setSel(null);
      }}
    >
      {/* Lifelines */}
      {parties.map((p, i) => (
        <div
          key={`line-${p.id}`}
          aria-hidden
          className="absolute border-l border-dashed border-indigo-300 dark:border-indigo-700"
          style={{ left: colX(i), top: HEADER_H, height: height - HEADER_H }}
        />
      ))}

      {/* Header buttons */}
      {parties.map((p, i) => {
        const selected = sel?.kind === "party" && sel.id === p.id;
        return (
          <div
            key={p.id}
            data-party-id={p.id}
            role="button"
            tabIndex={0}
            aria-label={`${p.actor ? "Actor" : "Participant"} ${displayName(p)}`}
            className={`absolute flex cursor-grab items-center justify-center rounded-md border border-indigo-400 bg-white px-2 text-xs text-indigo-950 transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-zinc-900 dark:text-indigo-100 ${
              selected ? "ring-2 ring-ring" : ""
            }`}
            style={{
              left: i * COL_W + 4,
              top: 6,
              width: COL_W - 12,
              height: 36,
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              hdrDrag.current = {
                index: i,
                startX: e.clientX,
                moved: false,
                target: i,
              };
            }}
            onPointerMove={(e) => {
              const d = hdrDrag.current;
              if (!d || d.index !== i) return;
              if (!d.moved && Math.abs(e.clientX - d.startX) < DRAG_THRESHOLD) {
                return;
              }
              d.moved = true;
              const [x] = canvasPoint(e);
              const t = clamp(Math.floor(x / COL_W), 0, parties.length - 1);
              d.target = t;
              setHdrTarget(t);
            }}
            onPointerUp={() => {
              const d = hdrDrag.current;
              hdrDrag.current = null;
              setHdrTarget(null);
              if (!d) return;
              if (d.moved) {
                moveParty(d.index, d.target);
              } else {
                setSel({ kind: "party", id: p.id });
              }
            }}
            onDoubleClick={() => setEditing({ kind: "party", id: p.id })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setEditing({ kind: "party", id: p.id });
              } else if (e.key === "Delete" || e.key === "Backspace") {
                e.preventDefault();
                removeParty(p.id);
              } else if (
                e.altKey &&
                (e.key === "ArrowLeft" || e.key === "ArrowRight")
              ) {
                e.preventDefault();
                const to =
                  e.key === "ArrowLeft"
                    ? clamp(i - 1, 0, parties.length - 1)
                    : clamp(i + 1, 0, parties.length - 1);
                moveParty(i, to);
                e.currentTarget.focus();
              }
            }}
          >
            {displayName(p)}
          </div>
        );
      })}

      {/* Header reorder insertion marker */}
      {hdrTarget !== null && (
        <div
          aria-hidden
          className="absolute w-0.5 bg-indigo-500"
          style={{ left: hdrTarget * COL_W, top: 0, height: HEADER_H }}
        />
      )}

      {/* Message rows */}
      {messages.map((m, i) => {
        const fromIdx = parties.findIndex((p) => p.id === m.from);
        const toIdx = parties.findIndex((p) => p.id === m.to);
        if (fromIdx < 0 || toIdx < 0) return null;
        const from = parties[fromIdx];
        const to = parties[toIdx];
        const selected = sel?.kind === "msg" && sel.index === i;
        const left = Math.min(fromIdx, toIdx);
        const span = Math.abs(toIdx - fromIdx);
        const textLabel = `Message ${displayName(from)} to ${displayName(to)}: ${m.text}`;
        return (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: messages may be duplicated and have no stable id
            key={`${m.from}-${m.to}-${m.arrow}-${i}`}
            role="button"
            tabIndex={0}
            aria-label={textLabel}
            className={`absolute text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
              selected ? "bg-indigo-100/70 dark:bg-indigo-900/40" : ""
            }`}
            style={{ left: 0, top: rowY(i), width, height: ROW_H }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setEditing({ kind: "msg", index: i });
              } else if (e.key === "Delete" || e.key === "Backspace") {
                e.preventDefault();
                removeMessage(i);
              } else if (
                e.altKey &&
                (e.key === "ArrowUp" || e.key === "ArrowDown")
              ) {
                e.preventDefault();
                const to2 =
                  e.key === "ArrowUp"
                    ? clamp(i - 1, 0, messages.length - 1)
                    : clamp(i + 1, 0, messages.length - 1);
                moveMessage(i, to2);
                e.currentTarget.focus();
              }
            }}
          >
            <button
              type="button"
              tabIndex={-1}
              data-no-ghost
              aria-label="Reorder message"
              className="absolute left-1 top-3 cursor-grab rounded px-1 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300"
              style={{ height: ROW_H - 12 }}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                rowDrag.current = {
                  index: i,
                  startY: e.clientY,
                  moved: false,
                  target: i,
                };
              }}
              onPointerMove={(e) => {
                const d = rowDrag.current;
                if (!d || d.index !== i) return;
                if (
                  !d.moved &&
                  Math.abs(e.clientY - d.startY) < DRAG_THRESHOLD
                ) {
                  return;
                }
                d.moved = true;
                const [, y] = canvasPoint(e);
                const t = clamp(
                  Math.floor((y - HEADER_H) / ROW_H),
                  0,
                  messages.length - 1,
                );
                d.target = t;
                setRowTarget(t);
              }}
              onPointerUp={() => {
                const d = rowDrag.current;
                rowDrag.current = null;
                setRowTarget(null);
                if (d?.moved) moveMessage(d.index, d.target);
              }}
            >
              ⠿
            </button>
            {span > 0 && (
              <>
                <span
                  className="absolute whitespace-nowrap text-indigo-700 dark:text-indigo-300"
                  style={{
                    left: colX(left) + 24,
                    top: ROW_H / 2 - 18,
                    maxWidth: span * COL_W - 48,
                  }}
                >
                  {m.text}
                </span>
                <button
                  type="button"
                  data-no-ghost
                  aria-label={`Cycle arrow type for ${textLabel}`}
                  className="absolute rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{
                    left: colX(Math.min(fromIdx, toIdx)) + 24,
                    top: ROW_H / 2 - 4,
                    width: span * COL_W - 48,
                    height: 16,
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => cycleArrow(i)}
                />
              </>
            )}
          </div>
        );
      })}

      {/* Row reorder insertion marker */}
      {rowTarget !== null && (
        <div
          aria-hidden
          className="absolute h-0.5 bg-indigo-500"
          style={{ left: 0, top: rowY(rowTarget), width }}
        />
      )}

      {/* Arrow layer */}
      <svg
        aria-hidden
        className="pointer-events-none absolute left-0 top-0"
        width={width}
        height={height}
      >
        <defs>
          <marker
            id="sc-marker-filled"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L8,3 L0,6 Z" fill={ARROW_COLOR} />
          </marker>
          <marker
            id="sc-marker-open"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="4"
            orient="auto"
          >
            <path d="M1,0 L9,4 L1,8" fill="none" stroke={ARROW_COLOR} />
          </marker>
          <marker
            id="sc-marker-x"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="4"
            orient="auto"
          >
            <path d="M2,0 L8,8 M8,0 L2,8" stroke={ARROW_COLOR} />
          </marker>
        </defs>
        {messages.map((m, i) => {
          const fromIdx = parties.findIndex((p) => p.id === m.from);
          const toIdx = parties.findIndex((p) => p.id === m.to);
          if (fromIdx < 0 || toIdx < 0) return null;
          const y = rowY(i) + ROW_H / 2;
          if (fromIdx === toIdx) {
            const cx = colX(fromIdx);
            return (
              <path
                // biome-ignore lint/suspicious/noArrayIndexKey: messages may be duplicated and have no stable id
                key={`arrow-${i}`}
                d={`M ${cx} ${y - 6} C ${cx + 34} ${y - 26} ${cx + 50} ${y + 12} ${cx + 6} ${y + 2}`}
                fill="none"
                stroke={ARROW_COLOR}
                strokeWidth="1.5"
                strokeDasharray={isDashed(m.arrow) ? "6 4" : undefined}
                markerEnd={arrowMarker(m.arrow)}
              />
            );
          }
          const dir = toIdx > fromIdx ? 1 : -1;
          const x1 = colX(fromIdx) + dir * 28;
          const x2 = colX(toIdx) - dir * 6;
          return (
            <line
              // biome-ignore lint/suspicious/noArrayIndexKey: messages may be duplicated and have no stable id
              key={`arrow-${i}`}
              x1={x1}
              y1={y}
              x2={x2}
              y2={y}
              stroke={ARROW_COLOR}
              strokeWidth="1.5"
              strokeDasharray={isDashed(m.arrow) ? "6 4" : undefined}
              markerEnd={arrowMarker(m.arrow)}
            />
          );
        })}
        {ghost && (
          <line
            x1={colX(ghost.fromCol)}
            y1={ghost.sy}
            x2={ghost.x}
            y2={ghost.y}
            stroke={ARROW_COLOR}
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.7"
          />
        )}
      </svg>

      {/* Label editors */}
      {editing?.kind === "party" && editingParty && (
        <LabelEditor
          value={editingParty.label ?? ""}
          x={editingPartyIdx * COL_W + 8}
          y={10}
          width={COL_W - 20}
          onCommit={(v) => {
            commit({
              ...model,
              parties: parties.map((p) =>
                p.id === editingParty.id
                  ? { ...p, label: v.trim() || null }
                  : p,
              ),
            });
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}
      {editing?.kind === "msg" &&
        messages[editing.index] &&
        (() => {
          const m = messages[editing.index];
          const fi = parties.findIndex((p) => p.id === m.from);
          const ti = parties.findIndex((p) => p.id === m.to);
          const lo = clamp(Math.min(fi, ti), 0, parties.length - 1);
          return (
            <LabelEditor
              value={m.text}
              x={colX(lo) - COL_W / 2 + 8}
              y={rowY(editing.index) + 4}
              width={COL_W - 8}
              onCommit={(v) => {
                const next = [...messages];
                next[editing.index] = {
                  ...next[editing.index],
                  text: v.trim() || "message",
                };
                commit({ ...model, messages: next });
                setEditing(null);
              }}
              onCancel={() => setEditing(null)}
            />
          );
        })()}

      {parties.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Drag a participant here, or tap one in the palette.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
      <Palette kind="seq" onAddParty={(actor) => addParty(actor)} />
      <div
        ref={canvasRef}
        data-testid="sequence-canvas"
        className="relative min-h-96 min-w-0 flex-1 cursor-grab overflow-auto rounded-md border border-border bg-indigo-50/40 active:cursor-grabbing dark:bg-indigo-950/30"
        onPointerDown={panFrom}
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
        }}
        onPointerCancel={(e) => {
          const p = panRef.current;
          panRef.current = null;
          if (p && e.currentTarget.hasPointerCapture(p.pointerId)) {
            e.currentTarget.releasePointerCapture(p.pointerId);
          }
        }}
      >
        {content}
      </div>
      <div aria-live="polite" role="status" className="sr-only">
        {announce}
      </div>
    </div>
  );
}
