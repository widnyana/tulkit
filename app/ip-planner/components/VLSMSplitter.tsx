"use client";

import { useState } from "react";
import type { VLSMResult } from "../types";
import { splitVLSM } from "../utils";

export default function VLSMSplitter() {
  const [parentBlock, setParentBlock] = useState("10.10.0.0/22");
  const [requiredSizesInput, setRequiredSizesInput] = useState("500, 200, 100");
  const [results, setResults] = useState<VLSMResult[]>([]);
  const [error, setError] = useState<string>("");

  const handleCalculate = () => {
    setError("");
    setResults([]);

    // Parse required sizes
    const sizes = requiredSizesInput
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n) && n > 0);

    if (sizes.length === 0) {
      setError("Please enter at least one valid host count");
      return;
    }

    const vlsmResults = splitVLSM(parentBlock.trim(), sizes);

    if (!vlsmResults) {
      setError("Invalid CIDR block or insufficient space for required subnets");
      return;
    }

    setResults(vlsmResults);
  };

  const copyResults = () => {
    const text = results
      .map(
        (r) =>
          `${r.cidrNotation} | Mask: ${r.mask} | Hosts: ${r.usableHosts} | Range: ${r.firstIP} - ${r.lastIP}`,
      )
      .join("\n");
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          VLSM Subnet Splitter
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Split a large network block into smaller subnets based on required
          host counts
        </p>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="parentBlock"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Parent Network Block (CIDR)
            </label>
            <input
              id="parentBlock"
              type="text"
              value={parentBlock}
              onChange={(e) => setParentBlock(e.target.value)}
              placeholder="e.g., 10.10.0.0/22"
              className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="requiredSizes"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Required Host Counts (comma-separated)
            </label>
            <input
              id="requiredSizes"
              type="text"
              value={requiredSizesInput}
              onChange={(e) => setRequiredSizesInput(e.target.value)}
              placeholder="e.g., 500, 200, 100, 50"
              className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the number of usable hosts needed for each subnet
            </p>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleCalculate}
              className="px-6 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              Calculate Subnets
            </button>
            {results.length > 0 && (
              <button
                type="button"
                onClick={copyResults}
                className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                Copy Results
              </button>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Calculated Subnets ({results.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Network
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CIDR
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subnet Mask
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usable Hosts
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usable Range
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((result) => (
                  <tr key={result.cidrNotation} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">
                      {result.network}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">
                      /{result.cidr}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-600">
                      {result.mask}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {result.usableHosts.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-600">
                      {result.firstIP} - {result.lastIP}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
