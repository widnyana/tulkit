"use client";

import type { SeqModel } from "@/lib/mermaid-editor/types";
import { parseAny, serialize } from "@/lib/mermaid-editor";
import { LabelEditor } from "./LabelEditor";
import { Palette } from "./Palette";
import {
  addMessage,
  addParty,
  removeMessage,
  removeParty,
  renameMessage,
  renameParty,
} from "@/lib/mermaid-editor/edit";
import { hitFromElement, type Hit } from "@/lib/mermaid-editor/hit";
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

const PARTY_MIME = "application/x-tulkit-party";

type LabelTarget = {
  kind: "party" | "message";
  id: string;
  index?: number;
  value: string;
  x: number;
  y: number;
  width: number;
};

export function useSequencePreviewEditor(opts: {
  code: string;
  enabled: boolean;
  svgHost: RefObject<HTMLDivElement | null>;
  box: RefObject<HTMLElement | null>;
  renderTick: number;
  onCommit: (nextCode: string) => void;
}): {
  model: SeqModel | null;
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
  const model: SeqModel | null =
    parsed.ok && parsed.model.kind === "sequence" ? parsed.model : null;
  const reason: string | null = parsed.ok
    ? parsed.model.kind === "sequence"
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
  const [pendingEdit, setPendingEdit] = useState<
    { kind: "party"; id: string } | { kind: "message"; index: number } | null
  >(null);
  const dragMsg = useRef<{
    from: string;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const ghostCancelled = useRef(false);

  const commit = useCallback(
    (m: SeqModel) => {
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

  const headerBox = useCallback(
    (id: string) =>
      svgHost.current?.querySelector(
        `[data-et="participant"][data-id="${id}"]`,
      ) ?? null,
    [svgHost],
  );

  const lifeLine = useCallback(
    (id: string) =>
      svgHost.current?.querySelector(
        `[data-et="life-line"][data-id="${id}"]`,
      ) ?? null,
    [svgHost],
  );

  const partyNear = useCallback(
    (clientX: number): string | null => {
      if (!model) return null;
      let best: string | null = null;
      let bestDist = Number.POSITIVE_INFINITY;
      for (const p of model.parties) {
        const el = headerBox(p.id) ?? lifeLine(p.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const dist = Math.abs(clientX - cx);
        if (dist < bestDist) {
          bestDist = dist;
          best = p.id;
        }
      }
      if (best !== null && bestDist <= 24) return best;
      return null;
    },
    [model, headerBox, lifeLine],
  );

  const partyStart = useCallback(
    (e: ReactPointerEvent<HTMLElement>): string | null => {
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const hit = hitAt(target);
      if (hit?.kind === "party") return hit.id;
      return partyNear(e.clientX);
    },
    [hitAt, partyNear],
  );

  const messageEl = useCallback(
    (index: number) =>
      svgHost.current?.querySelectorAll('[data-et="message"]')[index] ?? null,
    [svgHost],
  );

  // Selection highlight: clear then set after each render.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-runs on each successful render
  useEffect(() => {
    const svg = svgHost.current?.querySelector("svg");
    if (!svg) return;
    for (const el of svg.querySelectorAll("[data-tulkit-selected]"))
      el.removeAttribute("data-tulkit-selected");
    if (!active || !sel || !model) return;
    if (sel.kind === "party") {
      for (const el of svg.querySelectorAll(
        `[data-et="participant"][data-id="${sel.id}"]`,
      ))
        el.setAttribute("data-tulkit-selected", "");
    } else if (sel.kind === "message") {
      const el = messageEl(sel.index);
      el?.setAttribute("data-tulkit-selected", "");
    }
  }, [renderTick, sel, active, model, svgHost, messageEl]);

  const openLabel = useCallback(
    (target: {
      kind: "party" | "message";
      id: string;
      index?: number;
      value: string;
    }) => {
      const el =
        target.kind === "party"
          ? headerBox(target.id)
          : messageEl(target.index ?? 0);
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const brect = box.current?.getBoundingClientRect();
      if (!brect) return false;
      setLabel({
        ...target,
        x: rect.left - brect.left,
        y: rect.top - brect.top,
        width:
          target.kind === "party"
            ? Math.max(96, rect.width)
            : Math.max(120, rect.width),
      });
      return true;
    },
    [headerBox, messageEl, box],
  );

  // Open the label editor for a just-added party or message.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-runs on each successful render
  useEffect(() => {
    if (!pendingEdit || !active || !model) return;
    const target =
      pendingEdit.kind === "party"
        ? { kind: "party" as const, id: pendingEdit.id, value: pendingEdit.id }
        : model.messages[pendingEdit.index]
          ? {
              kind: "message" as const,
              id: String(pendingEdit.index),
              index: pendingEdit.index,
              value: "message",
            }
          : null;
    if (!target) {
      setPendingEdit(null);
      return;
    }
    // Wait for a render where the element exists; keep the pending edit until
    // then so a late re-render still opens the editor.
    if (!openLabel(target)) return;
    setPendingEdit(null);
  }, [renderTick, pendingEdit, active, model, openLabel]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!active || !model) return false;
      if (e.button !== 0) return false;
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const hit = hitAt(target);
      if (hit?.kind === "message") {
        setSel(hit);
        e.currentTarget.focus({ preventScroll: true });
        return true;
      }
      const from = partyStart(e);
      if (from !== null) {
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.focus({ preventScroll: true });
        dragMsg.current = {
          from,
          startX: e.clientX,
          startY: e.clientY,
          moved: false,
        };
        ghostCancelled.current = false;
        return true;
      }
      setSel(null);
      return false;
    },
    [active, model, hitAt, partyStart],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const d = dragMsg.current;
      if (!active || !d) return false;
      if (
        !d.moved &&
        Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 3
      )
        return true;
      const startEl = headerBox(d.from) ?? lifeLine(d.from);
      if (!startEl) return true;
      const rect = startEl.getBoundingClientRect();
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
    [active, headerBox, lifeLine, boxPoint],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const d = dragMsg.current;
      setGhost(null);
      dragMsg.current = null;
      if (!active || !model || !d) return false;
      if (!d.moved) {
        setSel({ kind: "party", id: d.from });
        return true;
      }
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const hit = hitAt(target);
      const to = hit?.kind === "party" ? hit.id : partyNear(e.clientX);
      if (to === null) return true;
      let insert = 0;
      const svg = svgHost.current?.querySelector("svg");
      if (svg) {
        for (const el of svg.querySelectorAll('[data-et="message"]')) {
          const r = el.getBoundingClientRect();
          if (r.top + r.height / 2 < d.startY) insert += 1;
        }
      }
      const added = addMessage(model, d.from, to, insert);
      if (added.index === -1) return true;
      commit(added.model);
      setPendingEdit({ kind: "message", index: added.index });
      return true;
    },
    [active, model, hitAt, partyNear, svgHost, commit],
  );

  const onDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!active || !model) return;
      const at = document.elementFromPoint(e.clientX, e.clientY);
      const hit = hitAt(at);
      if (!hit || hit.kind === "empty" || !at) return;
      if (hit.kind === "party") {
        const party = model.parties.find((p) => p.id === hit.id);
        if (!party) return;
        openLabel({
          kind: "party",
          id: hit.id,
          value: party.label ?? party.id,
        });
      } else if (hit.kind === "message") {
        const msg = model.messages[hit.index];
        if (!msg) return;
        openLabel({
          kind: "message",
          id: String(hit.index),
          index: hit.index,
          value: msg.text,
        });
      }
    },
    [active, model, hitAt, openLabel],
  );

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLElement>) => {
      if (!active || !model) return;
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      if (e.key === "Escape") {
        if (dragMsg.current) {
          ghostCancelled.current = true;
          setGhost(null);
          dragMsg.current = null;
          return;
        }
        setSel(null);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && sel) {
        e.preventDefault();
        if (sel.kind === "party") commit(removeParty(model, sel.id));
        else if (sel.kind === "message")
          commit(removeMessage(model, sel.index));
      }
    },
    [active, model, sel, commit],
  );

  const onDragOver = useCallback(
    (e: ReactDragEvent<HTMLElement>) => {
      if (!active) return;
      if (e.dataTransfer.types.includes(PARTY_MIME)) e.preventDefault();
    },
    [active],
  );

  const onDrop = useCallback(
    (e: ReactDragEvent<HTMLElement>) => {
      if (!active || !model) return;
      const type = e.dataTransfer.getData(PARTY_MIME);
      if (type !== "participant" && type !== "actor") return;
      e.preventDefault();
      let insert = 0;
      for (const p of model.parties) {
        const el = headerBox(p.id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.left + r.width / 2 < e.clientX) insert += 1;
      }
      const added = addParty(model, type === "actor", insert);
      commit(added.model);
      setPendingEdit({ kind: "party", id: added.id });
    },
    [active, model, headerBox, commit],
  );

  const onAddParty = useCallback(
    (actor: boolean) => {
      if (!model) return;
      const added = addParty(model, actor);
      commit(added.model);
      setPendingEdit({ kind: "party", id: added.id });
    },
    [model, commit],
  );

  const onLabelCommit = useCallback(
    (text: string) => {
      const l = label;
      setLabel(null);
      if (!l || !model) return;
      if (l.kind === "party") {
        const party = model.parties.find((p) => p.id === l.id);
        if (party && (party.label ?? party.id) !== text)
          commit(renameParty(model, l.id, text));
      } else if (l.kind === "message" && l.index !== undefined) {
        const msg = model.messages[l.index];
        if (msg && msg.text !== text)
          commit(renameMessage(model, l.index, text));
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
        <Palette kind="seq" onAddParty={(actor) => onAddParty(actor)} />
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
