/**
 * NotNodeView: Renders logical NOT
 *
 * Displays "Must NOT match" with child node
 */

import { useState } from "react";
import type { NotNode } from "../ast-types";
import { NodeRenderer } from "./NodeRenderer";
import { sanitizeText } from "../security";

interface NotNodeViewProps {
  node: NotNode;
  level: number;
}

export function NotNodeView({ node, level }: NotNodeViewProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2);

  return (
    <div className="border-l-2 border-red-300 pl-3 my-2">
      <div className="flex items-center gap-3 py-2">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-expanded={isExpanded}
        >
          {isExpanded ? "▼" : "▶"}
        </button>

        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900">
            NOT
          </span>
          <span className="text-sm text-muted-foreground">Must NOT match</span>
        </div>
      </div>

      {node.description && (
        <div className="text-sm text-foreground bg-muted px-3 py-2 rounded border-l-2 border-red-200 dark:border-red-800 ml-6 mb-2">
          {sanitizeText(node.description)}
        </div>
      )}

      {isExpanded && (
        <div className="ml-6 mt-2">
          <NodeRenderer node={node.node} level={level + 1} />
        </div>
      )}
    </div>
  );
}
