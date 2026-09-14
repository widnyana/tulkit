/**
 * NotNodeView: Renders logical NOT
 *
 * Displays "Must NOT match" with child node
 */

import { useState } from "react";
import type { NotNode } from "../ast-types";
import { NodeRenderer } from "./NodeRenderer";
import {
  DescriptionBlock,
  MetaBadge,
  TreeChildren,
  TreeRow,
  TreeToggle,
} from "./tree-ui";
import { sanitizeText } from "../security";

interface NotNodeViewProps {
  node: NotNode;
  level: number;
  expandAll?: boolean;
}

const COMBINER_BADGE =
  "text-xs font-semibold px-2 py-0.5 rounded border whitespace-nowrap bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800";

export function NotNodeView({ node, level, expandAll }: NotNodeViewProps) {
  const [isExpanded, setIsExpanded] = useState(expandAll ?? level < 2);
  const toggle = () => setIsExpanded(!isExpanded);

  return (
    <div>
      <TreeRow expandable onToggle={toggle}>
        <div className="w-6 shrink-0 flex items-center justify-center">
          <TreeToggle expanded={isExpanded} onToggle={toggle} />
        </div>

        <div className="flex items-center gap-2">
          <span className={COMBINER_BADGE}>NOT</span>
          <MetaBadge>Must NOT match</MetaBadge>
        </div>
      </TreeRow>

      {node.description && (
        <DescriptionBlock text={sanitizeText(node.description)} />
      )}

      {isExpanded && (
        <TreeChildren>
          <NodeRenderer
            node={node.node}
            level={level + 1}
            expandAll={expandAll}
          />
        </TreeChildren>
      )}
    </div>
  );
}
