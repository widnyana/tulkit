/**
 * DiscriminatorBadge: Displays discriminator information for XorNode
 *
 * Shows property path and value→branch mapping when discriminator detected.
 * Shows "No discriminator detected" when null (ambiguous case).
 */

import type { Discriminator } from "../ast-types";
import { formatDiscriminatorPath } from "../discriminator-detection";
import { useState } from "react";

interface DiscriminatorBadgeProps {
  discriminator: Discriminator | null;
}

export function DiscriminatorBadge({ discriminator }: DiscriminatorBadgeProps) {
  const [showMapping, setShowMapping] = useState(false);

  if (!discriminator) {
    return (
      <span
        className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded border border-gray-300 italic"
        title="No unique discriminator field detected - branches may overlap"
      >
        No discriminator
      </span>
    );
  }

  const pathStr = formatDiscriminatorPath(discriminator.path);
  const mappingEntries = Object.entries(discriminator.mapping);

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded border border-indigo-200 font-mono">
        discriminator: {pathStr}
      </span>

      <button
        type="button"
        onClick={() => setShowMapping(!showMapping)}
        className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
      >
        {showMapping ? "Hide" : "Show"} mapping
      </button>

      {showMapping && (
        <div className="absolute mt-2 z-10 bg-white border border-gray-300 rounded shadow-lg p-3">
          <div className="text-xs font-semibold text-gray-700 mb-2">
            Value → Branch mapping:
          </div>
          <table className="text-xs font-mono">
            <tbody>
              {mappingEntries.map(([value, branchIndex]) => (
                <tr key={value}>
                  <td className="pr-3 text-gray-600">{value}</td>
                  <td className="text-gray-400">→</td>
                  <td className="pl-3 text-indigo-600">branch [{branchIndex}]</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
