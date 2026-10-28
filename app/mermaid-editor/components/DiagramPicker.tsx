"use client";

import {
  GitBranch,
  GitMerge,
  ListTree,
  Network,
  PieChart,
  Table2,
  Timer,
  Waypoints,
  Workflow,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DIAGRAM_TEMPLATES } from "@/lib/mermaid-editor/templates";

const ICONS: Record<string, typeof Workflow> = {
  flowchart: Workflow,
  sequence: Network,
  class: Table2,
  state: Waypoints,
  er: GitMerge,
  gantt: Timer,
  pie: PieChart,
  mindmap: ListTree,
  timeline: GitBranch,
  gitgraph: GitBranch,
};

export function DiagramPicker({
  onPick,
}: {
  onPick: (code: string, visual: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <Button
        type="button"
        variant="outline"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        New diagram
      </Button>
      {open && (
        <div
          className="absolute z-20 mt-2 w-[min(28rem,90vw)] rounded-lg border border-border bg-card p-3 shadow-lg"
          role="dialog"
          aria-label="Choose a diagram type"
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DIAGRAM_TEMPLATES.map((t) => {
              const Icon = ICONS[t.key] ?? Workflow;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    onPick(t.code, t.visual);
                    setOpen(false);
                  }}
                  className="flex flex-col items-start gap-1 rounded-md border border-border p-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Icon className="size-4" aria-hidden />
                    {t.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t.blurb}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            aria-label="Close diagram picker"
            onClick={() => setOpen(false)}
            className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
