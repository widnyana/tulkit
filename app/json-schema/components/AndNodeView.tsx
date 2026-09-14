/**
 * AndNodeView: Renders logical AND (allOf)
 *
 * Displays "All of these must match" with all child nodes
 */

import { useState } from "react";
import type { AndNode } from "../ast-types";
import { NodeRenderer } from "./NodeRenderer";
import {
  DescriptionBlock,
  MetaBadge,
  TreeChildren,
  TreeRow,
  TreeToggle,
} from "./tree-ui";
import { sanitizeText } from "../security";

interface AndNodeViewProps {
  node: AndNode;
  level: number;
  expandAll?: boolean;
}

const COMBINER_BADGE =
  "text-xs font-semibold px-2 py-0.5 rounded border whitespace-nowrap bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800";

export function AndNodeView({ node, level, expandAll }: AndNodeViewProps) {
  const [isExpanded, setIsExpanded] = useState(expandAll ?? level < 2);
  const toggle = () => setIsExpanded(!isExpanded);

  return (
    <div>
      <TreeRow expandable onToggle={toggle}>
        <div className="w-6 shrink-0 flex items-center justify-center">
          <TreeToggle expanded={isExpanded} onToggle={toggle} />
        </div>

        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className={COMBINER_BADGE}>AND</span>
          <MetaBadge>
            All of these must match ({node.nodes.length} schemas)
          </MetaBadge>
        </div>
      </TreeRow>

      {node.description && (
        <DescriptionBlock text={sanitizeText(node.description)} />
      )}

      {isExpanded && (
        <TreeChildren>
          {node.nodes.map((childNode, index) => (
            <NodeRenderer
              key={`and-${index}`}
              node={childNode}
              level={level + 1}
              expandAll={expandAll}
            />
          ))}
        </TreeChildren>
      )}
    </div>
  );
}
