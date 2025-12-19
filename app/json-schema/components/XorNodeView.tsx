/**
 * XorNodeView: Renders logical XOR (oneOf)
 *
 * Displays "Exactly one must match" with discriminator badge and all branches
 */

import { useState } from "react";
import type { XorNode } from "../ast-types";
import { NodeRenderer } from "./NodeRenderer";
import { DiscriminatorBadge } from "./DiscriminatorBadge";
import { sanitizeText } from "../security";

interface XorNodeViewProps {
  node: XorNode;
  level: number;
}

export function XorNodeView({ node, level }: XorNodeViewProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2);

  return (
    <div className="border-l-2 border-purple-300 pl-3 my-2">
      <div className="flex items-center gap-3 py-2">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-gray-700 transition-colors"
          aria-expanded={isExpanded}
        >
          {isExpanded ? "▼" : "▶"}
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded border border-purple-200">
            XOR
          </span>
          <span className="text-sm text-gray-600">
            Exactly one must match ({node.nodes.length} schemas)
          </span>
          <DiscriminatorBadge discriminator={node.discriminator} />
        </div>
      </div>

      {node.description && (
        <div className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded border-l-2 border-purple-200 ml-6 mb-2">
          {sanitizeText(node.description)}
        </div>
      )}

      {isExpanded && (
        <div className="ml-6 mt-2 space-y-1">
          {node.nodes.map((childNode, index) => (
            <div
              key={`xor-${index}-${childNode.sourcePath}`}
              className="relative"
            >
              <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center">
                <span className="text-xs font-mono text-gray-400">
                  [{index}]
                </span>
              </div>
              <div className="ml-10">
                <NodeRenderer node={childNode} level={level + 1} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
