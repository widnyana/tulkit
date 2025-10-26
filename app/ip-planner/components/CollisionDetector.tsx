"use client";

import { useState, useId } from "react";
import type { CollisionCheck } from "../types";
import { detectCollisions } from "../utils";

export default function CollisionDetector() {
  const [existingSubnets, setExistingSubnets] = useState(
    "10.10.0.0/24\n10.10.1.0/24\n10.10.2.0/25",
  );
  const [newSubnet, setNewSubnet] = useState("10.10.1.128/25");
  const [result, setResult] = useState<CollisionCheck | null>(null);

  const existingSubnetsId = useId();
  const newSubnetId = useId();

  const handleCheck = () => {
    const subnets = existingSubnets
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const checkResult = detectCollisions(subnets, newSubnet.trim());
    setResult(checkResult);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Subnet Collision Detector
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Prevent network outages by checking if a new subnet overlaps with
          existing subnets
        </p>

        <div className="space-y-4">
          <div>
            <label
              htmlFor={existingSubnetsId}
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Existing Subnets (one per line)
            </label>
            <textarea
              id={existingSubnetsId}
              value={existingSubnets}
              onChange={(e) => setExistingSubnets(e.target.value)}
              rows={8}
              placeholder="e.g.,&#10;10.10.0.0/24&#10;10.10.1.0/24&#10;192.168.0.0/16"
              className="w-full px-4 py-2 text-gray-900 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              List all currently active subnets in CIDR notation
            </p>
          </div>

          <div>
            <label
              htmlFor={newSubnetId}
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Proposed New Subnet
            </label>
            <input
              id={newSubnetId}
              type="text"
              value={newSubnet}
              onChange={(e) => setNewSubnet(e.target.value)}
              placeholder="e.g., 10.10.3.0/24"
              className="w-full px-4 py-2 text-gray-900 font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <button
            type="button"
            onClick={handleCheck}
            className="px-6 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Check for Collisions
          </button>
        </div>
      </div>

      {result && (
        <div
          className={`rounded-lg shadow-md p-6 border-2 ${
            result.hasCollision
              ? "bg-red-50 border-red-300"
              : "bg-green-50 border-green-300"
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                result.hasCollision ? "bg-red-200" : "bg-green-200"
              }`}
            >
              <span className="text-3xl">
                {result.hasCollision ? "🔴" : "🟢"}
              </span>
            </div>
            <div>
              <h3
                className={`text-xl font-bold ${
                  result.hasCollision ? "text-red-900" : "text-green-900"
                }`}
              >
                {result.hasCollision ? "COLLISION DETECTED" : "NO COLLISION"}
              </h3>
              <p
                className={`text-sm ${
                  result.hasCollision ? "text-red-700" : "text-green-700"
                }`}
              >
                {result.message}
              </p>
            </div>
          </div>

          {result.hasCollision && result.overlappingSubnets.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-red-900 mb-2">
                Overlapping Subnets:
              </p>
              <div className="space-y-2">
                {result.overlappingSubnets.map((subnet) => (
                  <div
                    key={subnet}
                    className="bg-red-100 border border-red-300 rounded-lg p-3"
                  >
                    <p className="font-mono text-sm text-red-900">{subnet}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-lg">
                <p className="text-sm text-red-900 font-semibold mb-1">
                  ⚠️ Action Required
                </p>
                <p className="text-sm text-red-800">
                  The proposed subnet overlaps with{" "}
                  {result.overlappingSubnets.length} existing subnet(s). This
                  will cause IP address conflicts and network outages. Please
                  choose a different subnet range.
                </p>
              </div>
            </div>
          )}

          {!result.hasCollision && (
            <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded-lg">
              <p className="text-sm text-green-900 font-semibold mb-1">
                ✅ Safe to Deploy
              </p>
              <p className="text-sm text-green-800">
                The proposed subnet does not overlap with any existing subnets.
                It is safe to use this IP address range.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
