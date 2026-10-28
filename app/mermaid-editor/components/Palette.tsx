"use client";

import { DIRECTIONS, SHAPES } from "@/lib/mermaid-editor/types";
import type { Direction, Shape } from "@/lib/mermaid-editor/types";

const SHAPE_NAMES: Record<Shape, string> = {
  rect: "Box",
  round: "Round",
  diamond: "Decision",
  circle: "Circle",
  stadium: "Stadium",
};

// Small palette-button look per shape; the canvas node uses the same classes.
const SHAPE_ICON: Record<Shape, string> = {
  rect: "rounded-sm",
  round: "rounded-lg",
  diamond: "rounded-sm rotate-45 scale-75",
  circle: "rounded-full",
  stadium: "rounded-full",
};

const DIRECTION_OPTIONS = DIRECTIONS.filter((d) => d !== "TB");

// Flowchart palette (kind "flow", the default) or sequence palette (kind "seq").
export function Palette({
  kind = "flow",
  onAdd,
  onDirection,
  direction,
  onAddParty,
}: {
  kind?: "flow" | "seq";
  onAdd?: (shape: Shape) => void;
  onDirection?: (dir: Direction) => void;
  direction?: Direction;
  onAddParty?: (actor: boolean) => void;
}) {
  if (kind === "seq") {
    return (
      <div className="flex w-28 shrink-0 flex-col gap-2" data-testid="palette">
        <button
          type="button"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("application/x-tulkit-party", "participant");
            e.dataTransfer.effectAllowed = "copy";
          }}
          onClick={() => onAddParty?.(false)}
          className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            aria-hidden
            className="inline-block h-5 w-5 rounded-sm border border-indigo-400 bg-indigo-50 dark:bg-indigo-950"
          />
          Participant
        </button>
        <button
          type="button"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("application/x-tulkit-party", "actor");
            e.dataTransfer.effectAllowed = "copy";
          }}
          onClick={() => onAddParty?.(true)}
          className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            aria-hidden
            className="inline-block h-5 w-5 rounded-full border border-indigo-400 bg-indigo-50 dark:bg-indigo-950"
          />
          Actor
        </button>
      </div>
    );
  }
  return (
    <div className="flex w-28 shrink-0 flex-col gap-2" data-testid="palette">
      {SHAPES.map((shape) => (
        <button
          key={shape}
          type="button"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("application/x-tulkit-shape", shape);
            e.dataTransfer.effectAllowed = "copy";
          }}
          onClick={() => onAdd?.(shape)}
          className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            aria-hidden
            className={`inline-block h-4 w-6 border border-indigo-400 bg-indigo-50 dark:bg-indigo-950 ${SHAPE_ICON[shape]}`}
          />
          {SHAPE_NAMES[shape]}
        </button>
      ))}
      <label className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        Dir
        <select
          aria-label="Direction"
          value={direction ?? "TD"}
          onChange={(e) => onDirection?.(e.target.value as Direction)}
          className="rounded-md border border-border bg-background px-1 py-0.5 text-xs text-foreground"
        >
          {DIRECTION_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
