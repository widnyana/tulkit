/**
 * XorNodeView: Renders logical XOR (oneOf)
 *
 * Displays "Exactly one must match" with discriminator badge and all branches
 */

import { useState } from "react";
import type { XorNode } from "../ast-types";
import { NodeRenderer } from "./NodeRenderer";
import { DiscriminatorBadge } from "./DiscriminatorBadge";
import {
  DescriptionBlock,
  MetaBadge,
  TreeChildren,
  TreeRow,
  TreeToggle,
} from "./tree-ui";
import { sanitizeText } from "../security";

interface XorNodeViewProps {
  node: XorNode;
  level: number;
  expandAll?: boolean;
}

const COMBINER_BADGE =
  "text-xs font-semibold px-2 py-0.5 rounded border whitespace-nowrap bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800";

export function XorNodeView({ node, level, expandAll }: XorNodeViewProps) {
  const [isExpanded, setIsExpanded] = useState(expandAll ?? level < 2);
  const toggle = () => setIsExpanded(!isExpanded);

  return (
    <div>
      <TreeRow expandable onToggle={toggle}>
        <div className="w-6 shrink-0 flex items-center justify-center">
          <TreeToggle expanded={isExpanded} onToggle={toggle} />
        </div>

        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className={COMBINER_BADGE}>XOR</span>
          <MetaBadge>
            Exactly one must match ({node.nodes.length} schemas)
          </MetaBadge>
          <DiscriminatorBadge discriminator={node.discriminator} />
        </div>
      </TreeRow>

      {node.description && (
        <DescriptionBlock text={sanitizeText(node.description)} />
      )}

      {isExpanded && (
        <TreeChildren>
          {node.nodes.map((childNode, index) => (
            <div key={`xor-${childNode.sourcePath}`} className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center">
                <span className="text-xs font-mono text-muted-foreground">
                  {index}
                </span>
              </div>
              <div className="ml-8">
                <NodeRenderer
                  node={childNode}
                  level={level + 1}
                  expandAll={expandAll}
                />
              </div>
            </div>
          ))}
        </TreeChildren>
      )}
    </div>
  );
}
