/**
 * PrimitiveNodeView: Renders primitive types
 *
 * Displays type, enum/const, default value, and constraints
 */

import { useState } from "react";
import type { PrimitiveNode } from "../ast-types";
import { sanitizeText } from "../security";

interface PrimitiveNodeViewProps {
  node: PrimitiveNode;
  level: number;
}

export function PrimitiveNodeView({ node, level }: PrimitiveNodeViewProps) {
  const [showFullEnum, setShowFullEnum] = useState(false);

  const getTypeColor = (type: string) => {
    if (type === "string")
      return "bg-green-100 text-green-700 border-green-200";
    if (type === "number" || type === "integer")
      return "bg-blue-100 text-blue-700 border-blue-200";
    if (type === "boolean")
      return "bg-purple-100 text-purple-700 border-purple-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  const formatEnumValues = () => {
    if (!node.enum) return "";
    const formatted = node.enum.map((v) => JSON.stringify(v));

    if (formatted.length > 5 && !showFullEnum) {
      return formatted.slice(0, 5).join(", ") + "...";
    }
    return formatted.join(", ");
  };

  const truncateString = (str: string, maxLength: number = 50) => {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + "...";
  };

  return (
    <div className="border-l-2 border-transparent hover:border-gray-300 transition-colors">
      <div className="grid grid-cols-[auto_1fr_auto] gap-3 items-start py-2 px-3 rounded hover:bg-gray-50">
        {/* Icon */}
        <div className="flex items-center w-6">
          <span className="text-gray-300">•</span>
        </div>

        {/* Type badge */}
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-mono px-2 py-1 rounded border ${getTypeColor(
              node.type,
            )}`}
          >
            {node.type}
          </span>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {node.enum && (
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded border border-gray-200">
              {node.enum.length} values
            </span>
          )}
          {node.const !== undefined && (
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded border border-gray-200 font-mono">
              const: {JSON.stringify(node.const)}
            </span>
          )}
          {node.default !== undefined && (
            <span
              className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded border border-amber-200 font-mono max-w-xs truncate"
              title={JSON.stringify(node.default)}
            >
              default: {truncateString(JSON.stringify(node.default), 50)}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {node.description && (
        <div className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded border-l-2 border-blue-200 ml-10 mb-2">
          {sanitizeText(node.description)}
        </div>
      )}

      {/* Enum values */}
      {node.enum && (
        <div className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded border-l-2 border-gray-300 ml-10 mb-2">
          <span className="font-semibold text-gray-700">Accepted values:</span>{" "}
          <code className="font-mono break-all">{formatEnumValues()}</code>
          {node.enum.length > 5 && (
            <button
              type="button"
              onClick={() => setShowFullEnum(!showFullEnum)}
              className="ml-2 text-blue-600 hover:text-blue-700 font-semibold"
            >
              {showFullEnum ? "Show less" : `Show all ${node.enum.length}`}
            </button>
          )}
        </div>
      )}

      {/* Constraints */}
      {node.constraints && node.constraints.length > 0 && (
        <div className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded border-l-2 border-gray-300 ml-10 mb-2">
          <span className="font-semibold text-gray-700">Constraints:</span>{" "}
          <span className="space-x-3 font-mono">
            {node.constraints.map((constraint, idx) => (
              <span key={idx}>
                {constraint.type}: {String(constraint.value)}
              </span>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
