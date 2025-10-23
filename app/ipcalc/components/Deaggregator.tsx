"use client";

import { useState } from "react";
import { deaggregate } from "../utils";
import type { DeaggregationResult } from "../types";

export default function Deaggregator() {
  const [startIP, setStartIP] = useState("");
  const [endIP, setEndIP] = useState("");
  const [result, setResult] = useState<DeaggregationResult | null>(null);
  const [error, setError] = useState("");

  const handleCalculate = () => {
    setError("");
    setResult(null);

    if (!startIP.trim() || !endIP.trim()) {
      setError("Please enter both start and end IP addresses");
      return;
    }

    const deaggResult = deaggregate(startIP.trim(), endIP.trim());

    if (!deaggResult) {
      setError("Invalid IP addresses or invalid range");
      return;
    }

    setResult(deaggResult);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCalculate();
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleCopyAll = () => {
    if (result) {
      const text = result.cidrBlocks.join("\n");
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Deaggregator (IP Range to CIDR)
        </h2>
        <p className="text-gray-600 text-sm mb-6">
          Convert an IP address range into optimal CIDR blocks
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label
              htmlFor="startIP"
              className="block text-sm font-medium text-gray-900 mb-2"
            >
              Start IP Address
            </label>
            <input
              id="startIP"
              type="text"
              value={startIP}
              onChange={(e) => setStartIP(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., 192.168.1.10"
              className="w-full text-blue-900 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="endIP"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              End IP Address
            </label>
            <input
              id="endIP"
              type="text"
              value={endIP}
              onChange={(e) => setEndIP(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., 192.168.1.100"
              className="w-full px-4 text-blue-900 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleCalculate}
          className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Calculate CIDR Blocks
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
      </div>

      {result && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">CIDR Blocks</h3>
            <button
              type="button"
              onClick={handleCopyAll}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Copy All
            </button>
          </div>

          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-800">
                  Total IP Addresses:
                </span>
                <span className="ml-2 text-blue-900 font-mono">
                  {result.totalIPs.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="font-medium text-blue-800">
                  Number of Blocks:
                </span>
                <span className="ml-2 text-blue-900 font-mono">
                  {result.blockCount}
                </span>
              </div>
              <div>
                <span className="font-medium text-blue-800">Range:</span>
                <span className="ml-2 text-blue-900 font-mono">
                  {startIP} - {endIP}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {result.cidrBlocks.map((block, index) => (
              <div
                key={block}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-500 font-medium w-12">
                    #{index + 1}
                  </span>
                  <span className="text-sm font-mono font-semibold text-gray-900">
                    {block}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(block)}
                  className="px-3 py-1 text-xs bg-white text-gray-600 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
                  title="Copy to clipboard"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Info:</strong> These CIDR blocks optimally cover the
              specified IP range. You can use them for routing, firewall rules,
              or network configuration.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
