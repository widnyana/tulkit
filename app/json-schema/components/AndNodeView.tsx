/**
 * AndNodeView: Renders logical AND (allOf)
 *
 * Displays "All of these must match" with all child nodes
 */

import { useState } from "react";
import type { AndNode } from "../ast-types";
import { NodeRenderer } from "./NodeRenderer";

interface AndNodeViewProps {
  node: AndNode;
  level: number;
}

export function AndNodeView({ node, level }: AndNodeViewProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2);

  return (
    <div className="border-l-2 border-blue-300 pl-3 my-2">
      <div className="flex items-center gap-3 py-2">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-gray-700 transition-colors"
          aria-expanded={isExpanded}
        >
          {isExpanded ? "▼" : "▶"}
        </button>

        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded border border-blue-200">
            AND
          </span>
          <span className="text-sm text-gray-600">
            All of these must match ({node.nodes.length} schemas)
          </span>
        </div>
      </div>

      {node.description && (
        <div className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded border-l-2 border-blue-200 ml-6 mb-2">
          {node.description}
        </div>
      )}

      {isExpanded && (
        <div className="ml-6 mt-2 space-y-1">
          {node.nodes.map((childNode, index) => (
            <NodeRenderer
              key={`and-${index}-${childNode.sourcePath}`}
              node={childNode}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
