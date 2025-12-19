import { useState } from "react";
import type { SchemaNode } from "../types";

interface SchemaTreeProps {
  node: SchemaNode;
  level?: number;
  parentRequired?: string[];
  expandAll?: boolean;
}

export function SchemaTree({
  node,
  level = 0,
  parentRequired = [],
  expandAll = false,
}: SchemaTreeProps) {
  const [isExpanded, setIsExpanded] = useState(expandAll || level < 2);
  const [isHovered, setIsHovered] = useState(false);
  const [showFullEnum, setShowFullEnum] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isRequired = parentRequired.includes(node.name);

  const getTypeColor = (type: string | string[]) => {
    const types = Array.isArray(type) ? type : [type];
    if (types.includes("string")) return "bg-green-100 text-green-700 border-green-200";
    if (types.includes("number")) return "bg-blue-100 text-blue-700 border-blue-200";
    if (types.includes("boolean")) return "bg-purple-100 text-purple-700 border-purple-200";
    if (types.includes("array")) return "bg-orange-100 text-orange-700 border-orange-200";
    if (types.includes("object")) return "bg-indigo-100 text-indigo-700 border-indigo-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  const getTypeDisplay = (type: string | string[]) => {
    const types = Array.isArray(type) ? type : [type];
    return types.join(" | ");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatEnumValues = () => {
    if (!node.enum) return "";
    const formatted = node.enum.map(v => JSON.stringify(v));

    if (formatted.length > 5 && !showFullEnum) {
      return formatted.slice(0, 5).join(", ") + "...";
    }
    return formatted.join(", ");
  };

  const truncateString = (str: string, maxLength: number = 100) => {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + "...";
  };

  return (
    <div className="border-l-2 border-transparent hover:border-blue-300 transition-colors">
      {/* Main property row - using CSS Grid for alignment */}
      <div
        className={`grid grid-cols-[auto_1fr_auto_auto] gap-3 items-start py-2 px-3 rounded transition-colors ${
          isHovered ? "bg-blue-50" : "hover:bg-gray-50"
        }`}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Column 1: Expand/Collapse button */}
        <div className="flex items-center w-6">
          {hasChildren && (
            <button
              type="button"
              className="text-gray-400 hover:text-gray-700 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? "▼" : "▶"}
            </button>
          )}
          {!hasChildren && <span className="text-gray-300">•</span>}
        </div>

        {/* Column 2: Property name and path */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono font-medium text-base text-gray-900 truncate">
            {node.name}
          </span>
          {isHovered && (
            <button
              type="button"
              onClick={() => copyToClipboard(node.path)}
              className="text-xs text-gray-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
              title="Copy path"
            >
              📋
            </button>
          )}
        </div>

        {/* Column 3: Type badge */}
        <div>
          <span
            className={`text-xs font-mono px-2 py-1 rounded border ${getTypeColor(
              node.type,
            )}`}
          >
            {getTypeDisplay(node.type)}
          </span>
        </div>

        {/* Column 4: Badges (required, enum count, default) */}
        <div className="flex items-center gap-2 flex-wrap">
          {isRequired && (
            <span className="text-xs font-semibold px-2 py-1 bg-red-100 text-red-700 rounded border border-red-200">
              required
            </span>
          )}
          {node.enum && (
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded border border-gray-200">
              {node.enum.length} values
            </span>
          )}
          {node.defaultValue !== undefined && (
            <span
              className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded border border-amber-200 font-mono max-w-xs truncate"
              title={JSON.stringify(node.defaultValue)}
            >
              default: {truncateString(JSON.stringify(node.defaultValue), 50)}
            </span>
          )}
        </div>
      </div>

      {/* Metadata section */}
      <div
        className="space-y-1 pb-2"
        style={{ paddingLeft: `${level * 24 + 48}px` }}
      >
        {node.description && (
          <div className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded border-l-2 border-blue-200">
            {node.description}
          </div>
        )}

        {node.enum && (
          <div className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded border-l-2 border-gray-300">
            <span className="font-semibold text-gray-700">Accepted values:</span>{" "}
            <code className="font-mono break-all">
              {formatEnumValues()}
            </code>
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

        {node.constraints && (
          <div className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded border-l-2 border-gray-300">
            <span className="font-semibold text-gray-700">Constraints:</span>{" "}
            <span className="space-x-3 font-mono">
              {node.constraints.minimum !== undefined && (
                <span>min: {node.constraints.minimum}</span>
              )}
              {node.constraints.maximum !== undefined && (
                <span>max: {node.constraints.maximum}</span>
              )}
              {node.constraints.minLength !== undefined && (
                <span>minLength: {node.constraints.minLength}</span>
              )}
              {node.constraints.maxLength !== undefined && (
                <span>maxLength: {node.constraints.maxLength}</span>
              )}
              {node.constraints.pattern && (
                <span>pattern: {node.constraints.pattern}</span>
              )}
              {node.constraints.format && (
                <span>format: {node.constraints.format}</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="border-l-2 border-gray-200 ml-3">
          {node.children?.map((child, index) => (
            <SchemaTree
              key={`${child.path}-${index}`}
              node={child}
              level={level + 1}
              expandAll={expandAll}
            />
          ))}
        </div>
      )}
    </div>
  );
}
