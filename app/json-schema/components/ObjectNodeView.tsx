/**
 * ObjectNodeView: Renders object type with properties
 *
 * Displays properties in table-like layout with required indicators
 */

import { useState } from "react";
import type { ObjectNode } from "../ast-types";
import { NodeRenderer } from "./NodeRenderer";
import {
  CopyPathButton,
  DescriptionBlock,
  LeafDot,
  MetaBadge,
  RequiredBadge,
  TreeChildren,
  TreeDetail,
  TreeRow,
  TreeToggle,
  TypeBadge,
} from "./tree-ui";
import { sanitizeText } from "../security";

interface ObjectNodeViewProps {
  node: ObjectNode;
  level: number;
  expandAll?: boolean;
}

export function ObjectNodeView({
  node,
  level,
  expandAll,
}: ObjectNodeViewProps) {
  const [isExpanded, setIsExpanded] = useState(expandAll ?? level < 2);
  const propertyEntries = Object.entries(node.properties);
  const expandable = propertyEntries.length > 0;
  const toggle = () => setIsExpanded(!isExpanded);

  return (
    <div>
      <TreeRow expandable={expandable} onToggle={toggle}>
        <div className="w-6 shrink-0 flex items-center justify-center">
          {expandable ? (
            <TreeToggle expanded={isExpanded} onToggle={toggle} />
          ) : (
            <LeafDot />
          )}
        </div>

        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <TypeBadge type="object" />
          {expandable && (
            <MetaBadge>
              {propertyEntries.length}{" "}
              {propertyEntries.length === 1 ? "property" : "properties"}
            </MetaBadge>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {node.additionalProperties !== undefined && (
            <MetaBadge>
              {typeof node.additionalProperties === "boolean"
                ? node.additionalProperties
                  ? "additional allowed"
                  : "no additional"
                : "additional schema"}
            </MetaBadge>
          )}
          <CopyPathButton path={node.sourcePath} />
        </div>
      </TreeRow>

      {node.description && (
        <DescriptionBlock text={sanitizeText(node.description)} />
      )}

      {isExpanded && expandable && (
        <TreeChildren>
          {propertyEntries.map(([key, value]) => (
            <div key={key}>
              <div className="flex items-center gap-2 py-1 px-1">
                <span className="font-mono font-medium text-sm text-foreground truncate">
                  {key}
                </span>
                {node.required.has(key) && <RequiredBadge />}
              </div>
              <div className="ml-4">
                <NodeRenderer
                  node={value}
                  level={level + 1}
                  expandAll={expandAll}
                />
              </div>
            </div>
          ))}
        </TreeChildren>
      )}

      {isExpanded &&
        node.additionalProperties &&
        typeof node.additionalProperties !== "boolean" && (
          <TreeDetail>
            <div className="text-xs font-semibold text-muted-foreground mb-1">
              Additional properties schema:
            </div>
            <NodeRenderer
              node={node.additionalProperties}
              level={level + 1}
              expandAll={expandAll}
            />
          </TreeDetail>
        )}
    </div>
  );
}
