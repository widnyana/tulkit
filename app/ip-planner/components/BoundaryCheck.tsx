"use client";

import { useState } from "react";
import type { BoundaryCheckResult } from "../types";
import { suggestSubnetMask } from "../utils";

export default function BoundaryCheck() {
  const [startIP, setStartIP] = useState("192.168.1.0");
  const [requiredHosts, setRequiredHosts] = useState(50);
  const [result, setResult] = useState<BoundaryCheckResult | null>(null);
  const [error, setError] = useState<string>("");

  const handleCheck = () => {
    setError("");
    setResult(null);

    const checkResult = suggestSubnetMask(startIP.trim(), requiredHosts);

    if (!checkResult) {
      setError("Invalid IP address format");
      return;
    }

    setResult(checkResult);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Boundary Check & Subnet Suggestion
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Find the optimal subnet mask for your requirements and verify network
          boundaries
        </p>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="startIP"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Starting IP Address
            </label>
            <input
              id="startIP"
              type="text"
              value={startIP}
              onChange={(e) => setStartIP(e.target.value)}
              placeholder="e.g., 192.168.1.0"
              className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="requiredHosts"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Required Number of Hosts
            </label>
            <input
              id="requiredHosts"
              type="number"
              min="1"
              value={requiredHosts}
              onChange={(e) => setRequiredHosts(Number(e.target.value))}
              className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              The number of usable IP addresses needed
            </p>
          </div>

          <button
            type="button"
            onClick={handleCheck}
            className="px-6 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Check Boundary
          </button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                result.isValid ? "bg-green-100" : "bg-yellow-100"
              }`}
            >
              <span className="text-2xl">{result.isValid ? "🟢" : "🟡"}</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {result.isValid ? "Valid Network Address" : "Boundary Warning"}
            </h3>
          </div>

          {result.warning && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">{result.warning}</p>
            </div>
          )}

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Suggested Subnet Mask</p>
                <p className="text-lg font-mono font-semibold text-purple-600">
                  /{result.suggestedMask}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Network Address</p>
                <p className="text-lg font-mono font-semibold text-gray-900">
                  {result.network}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-2">
                Complete Network Information
              </p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Network:</span>
                  <span className="text-sm font-mono text-gray-900">
                    {result.network}/{result.suggestedMask}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Broadcast:</span>
                  <span className="text-sm font-mono text-gray-900">
                    {result.broadcast}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
