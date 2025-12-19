/**
 * ObjectNodeView: Renders object type with properties
 *
 * Displays properties in table-like layout with required indicators
 */

import { useState } from "react";
import type { ObjectNode } from "../ast-types";
import { NodeRenderer } from "./NodeRenderer";

interface ObjectNodeViewProps {
  node: ObjectNode;
  level: number;
}

export function ObjectNodeView({ node, level }: ObjectNodeViewProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const [hoveredProperty, setHoveredProperty] = useState<string | null>(null);
  const propertyEntries = Object.entries(node.properties);

  return (
    <div className="border-l-2 border-transparent hover:border-indigo-300 transition-colors">
      <div className="grid grid-cols-[auto_1fr_auto] gap-3 items-start py-2 px-3 rounded hover:bg-gray-50">
        {/* Expand/collapse */}
        <div className="flex items-center w-6">
          {propertyEntries.length > 0 && (
            <button
              type="button"
              className="text-gray-400 hover:text-gray-700 transition-colors"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-expanded={isExpanded}
            >
              {isExpanded ? "▼" : "▶"}
            </button>
          )}
        </div>

        {/* Type badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2 py-1 rounded border bg-indigo-100 text-indigo-700 border-indigo-200">
            object
          </span>
          {propertyEntries.length > 0 && (
            <span className="text-xs text-gray-500">
              {propertyEntries.length} {propertyEntries.length === 1 ? "property" : "properties"}
            </span>
          )}
        </div>

        {/* Additional properties indicator */}
        <div>
          {node.additionalProperties !== undefined && (
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded border border-gray-200">
              {typeof node.additionalProperties === "boolean"
                ? node.additionalProperties
                  ? "additional allowed"
                  : "no additional"
                : "additional schema"}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {node.description && (
        <div
          className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded border-l-2 border-indigo-200 ml-10 mb-2"
        >
          {node.description}
        </div>
      )}

      {/* Properties */}
      {isExpanded && propertyEntries.length > 0 && (
        <div className="ml-10 mt-2 space-y-1">
          {propertyEntries.map(([key, value]) => (
            <div
              key={key}
              className={`border-l-2 pl-3 transition-colors ${
                hoveredProperty === key ? "border-blue-300 bg-blue-50" : "border-gray-200"
              }`}
              onMouseEnter={() => setHoveredProperty(key)}
              onMouseLeave={() => setHoveredProperty(null)}
            >
              <div className="flex items-center gap-2 py-1">
                <span className="font-mono font-medium text-base text-gray-900">
                  {key}
                </span>
                {node.required.has(key) && (
                  <span className="text-xs font-semibold px-2 py-1 bg-red-100 text-red-700 rounded border border-red-200">
                    required
                  </span>
                )}
              </div>
              <div className="ml-3">
                <NodeRenderer node={value} level={level + 1} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Additional properties schema */}
      {isExpanded &&
        node.additionalProperties &&
        typeof node.additionalProperties !== "boolean" && (
          <div className="ml-10 mt-2 border-l-2 border-gray-300 pl-3">
            <div className="text-xs font-semibold text-gray-600 mb-1">
              Additional properties schema:
            </div>
            <NodeRenderer node={node.additionalProperties} level={level + 1} />
          </div>
        )}
    </div>
  );
}
