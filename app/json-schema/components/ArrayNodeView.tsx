/**
 * ArrayNodeView: Renders array type with items schema
 *
 * Displays array with items schema and constraints
 */

import { useState } from "react";
import type { ArrayNode } from "../ast-types";
import { NodeRenderer } from "./NodeRenderer";
import { sanitizeText } from "../security";

interface ArrayNodeViewProps {
  node: ArrayNode;
  level: number;
}

export function ArrayNodeView({ node, level }: ArrayNodeViewProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2);

  return (
    <div className="border-l-2 border-transparent hover:border-orange-300 transition-colors">
      <div className="grid grid-cols-[auto_1fr_auto] gap-3 items-start py-2 px-3 rounded hover:bg-muted">
        {/* Expand/collapse */}
        <div className="flex items-center w-6">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
          >
            {isExpanded ? "▼" : "▶"}
          </button>
        </div>

        {/* Type badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2 py-1 rounded border bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900">
            array
          </span>
          <span className="text-xs text-muted-foreground">items schema below</span>
        </div>

        {/* Constraints */}
        <div className="flex gap-2">
          {node.constraints?.map((constraint) => (
            <span
              key={`${constraint.type}-${String(constraint.value)}`}
              className="text-xs px-2 py-1 bg-muted text-foreground rounded border border-border font-mono"
            >
              {constraint.type}: {String(constraint.value)}
            </span>
          ))}
        </div>
      </div>

      {/* Description */}
      {node.description && (
        <div className="text-sm text-foreground bg-muted px-3 py-2 rounded border-l-2 border-orange-200 dark:border-orange-800 ml-10 mb-2">
          {sanitizeText(node.description)}
        </div>
      )}

      {/* Items schema */}
      {isExpanded && (
        <div className="ml-10 mt-2 border-l-2 border-border pl-3">
          <div className="text-xs font-semibold text-muted-foreground mb-1">Items:</div>
          <NodeRenderer node={node.items} level={level + 1} />
        </div>
      )}
    </div>
  );
}
