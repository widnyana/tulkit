"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { parseAny, serialize } from "@/lib/mermaid-editor";
import type { Model } from "@/lib/mermaid-editor/types";
import { FlowchartCanvas } from "./FlowchartCanvas";
import { SequenceCanvas } from "./SequenceCanvas";

// Canvases (U6) call this with their edited model; it serializes and hands the
// text back to the page, which keeps the text as the single source of truth.
export function commitModel(
  model: Model,
  onCommit: (nextCode: string) => void,
): void {
  onCommit(serialize(model));
}

export function VisualPanel({
  code,
  onCommit,
  onBackToText,
}: {
  code: string;
  onCommit: (nextCode: string) => void;
  onBackToText: () => void;
}) {
  const parsed = useMemo(() => parseAny(code), [code]);

  if (!parsed.ok) {
    const lineText =
      typeof parsed.line === "number"
        ? (code.split("\n")[parsed.line - 1] ?? "")
        : null;
    return (
      <div
        role="status"
        className="flex flex-1 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border p-8 text-center"
      >
        <p className="text-sm text-foreground">{parsed.reason}</p>
        {typeof parsed.line === "number" && (
          <p className="font-mono text-sm text-muted-foreground">
            line {parsed.line}: {lineText}
          </p>
        )}
        <Button type="button" variant="outline" onClick={onBackToText}>
          Back to Text
        </Button>
      </div>
    );
  }

  if (parsed.model.kind === "flowchart") {
    return (
      <FlowchartCanvas
        model={parsed.model}
        onCommit={(m) => commitModel(m, onCommit)}
      />
    );
  }

  return (
    <SequenceCanvas
      model={parsed.model}
      onCommit={(m) => commitModel(m, onCommit)}
    />
  );
}
