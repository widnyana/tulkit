/**
 * OrNodeView: Renders logical OR (anyOf)
 *
 * Displays "Any of these can match" with all child nodes
 */

import { useState } from "react";
import type { OrNode } from "../ast-types";
import { NodeRenderer } from "./NodeRenderer";
import {
  DescriptionBlock,
  MetaBadge,
  TreeChildren,
  TreeRow,
  TreeToggle,
} from "./tree-ui";
import { sanitizeText } from "../security";

interface OrNodeViewProps {
  node: OrNode;
  level: number;
  expandAll?: boolean;
}

const COMBINER_BADGE =
  "text-xs font-semibold px-2 py-0.5 rounded border whitespace-nowrap bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800";

export function OrNodeView({ node, level, expandAll }: OrNodeViewProps) {
  const [isExpanded, setIsExpanded] = useState(expandAll ?? level < 2);
  const toggle = () => setIsExpanded(!isExpanded);

  return (
    <div>
      <TreeRow expandable onToggle={toggle}>
        <div className="w-6 shrink-0 flex items-center justify-center">
          <TreeToggle expanded={isExpanded} onToggle={toggle} />
        </div>

        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className={COMBINER_BADGE}>OR</span>
          <MetaBadge>
            Any of these can match ({node.nodes.length} schemas)
          </MetaBadge>
        </div>
      </TreeRow>

      {node.description && (
        <DescriptionBlock text={sanitizeText(node.description)} />
      )}

      {isExpanded && (
        <TreeChildren>
          {node.nodes.map((childNode) => (
            <NodeRenderer
              key={`or-${childNode.sourcePath}`}
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
