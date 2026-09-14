/**
 * ArrayNodeView: Renders array type with items schema
 *
 * Displays array with items schema and constraints
 */

import { useState } from "react";
import type { ArrayNode } from "../ast-types";
import { NodeRenderer } from "./NodeRenderer";
import {
  CopyPathButton,
  DescriptionBlock,
  MetaBadge,
  TreeChildren,
  TreeRow,
  TreeToggle,
  TypeBadge,
} from "./tree-ui";
import { sanitizeText } from "../security";

interface ArrayNodeViewProps {
  node: ArrayNode;
  level: number;
  expandAll?: boolean;
}

export function ArrayNodeView({ node, level, expandAll }: ArrayNodeViewProps) {
  const [isExpanded, setIsExpanded] = useState(expandAll ?? level < 2);
  const toggle = () => setIsExpanded(!isExpanded);

  return (
    <div>
      <TreeRow expandable onToggle={toggle}>
        <div className="w-6 shrink-0 flex items-center justify-center">
          <TreeToggle expanded={isExpanded} onToggle={toggle} />
        </div>

        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <TypeBadge type="array" />
          <MetaBadge>items schema below</MetaBadge>
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {node.constraints?.map((constraint) => (
            <MetaBadge
              key={`${constraint.type}-${String(constraint.value)}`}
              mono
            >
              {constraint.type}: {String(constraint.value)}
            </MetaBadge>
          ))}
          <CopyPathButton path={node.sourcePath} />
        </div>
      </TreeRow>

      {node.description && (
        <DescriptionBlock text={sanitizeText(node.description)} />
      )}

      {isExpanded && (
        <TreeChildren>
          <NodeRenderer
            node={node.items}
            level={level + 1}
            expandAll={expandAll}
          />
        </TreeChildren>
      )}
    </div>
  );
}
