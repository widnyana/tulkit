"use client";

import Link from "next/link";
import { useState, useId } from "react";
import type { EnvComparisonResult } from "./types";
import { compareEnvFiles, parseEnvFile } from "./utils";

export default function EnvComparePage() {
  const [env1, setEnv1] = useState("");
  const [env2, setEnv2] = useState("");
  const [env1Name, setEnv1Name] = useState("");
  const [env2Name, setEnv2Name] = useState("");
  const [result, setResult] = useState<EnvComparisonResult | null>(null);

  const env1NameId = useId();
  const env1Id = useId();
  const env2NameId = useId();
  const env2Id = useId();

  const displayName1 = env1Name.trim() || "Environment 1";
  const displayName2 = env2Name.trim() || "Environment 2";

  const handleCompare = () => {
    const parsed1 = parseEnvFile(env1);
    const parsed2 = parseEnvFile(env2);
    const comparison = compareEnvFiles(parsed1, parsed2);
    setResult(comparison);
  };

  const handleClear = () => {
    setEnv1("");
    setEnv2("");
    setEnv1Name("");
    setEnv2Name("");
    setResult(null);
  };

  const copyKeys = (keys: string[]) => {
    const text = keys.join("\n");
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Home
        </Link>
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Environment Variable Comparator
          </h1>
          <p className="text-gray-600 mb-2">
            Compare environment files to identify differences and missing keys
          </p>
          <div className="flex items-start gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
            <svg
              className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <div className="text-sm text-green-800">
              <strong className="font-semibold">Privacy First:</strong> All
              comparisons are performed locally in your browser. No data is
              transmitted to any remote server.
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div>
            <label
              htmlFor={env1NameId}
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Environment Name
            </label>
            <input
              id={env1NameId}
              type="text"
              value={env1Name}
              onChange={(e) => setEnv1Name(e.target.value)}
              placeholder="e.g., Production, Staging, Development"
              className="w-full px-4 py-2 mb-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <label
              htmlFor={env1Id}
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Environment Variables
            </label>
            <textarea
              id={env1Id}
              value={env1}
              onChange={(e) => setEnv1(e.target.value)}
              className="w-full h-96 p-4 font-mono text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="DATABASE_URL=postgres://localhost:5432/db&#10;API_KEY=your-api-key&#10;NODE_ENV=production"
            />
          </div>

          <div>
            <label
              htmlFor={env2NameId}
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Environment Name
            </label>
            <input
              id={env2NameId}
              type="text"
              value={env2Name}
              onChange={(e) => setEnv2Name(e.target.value)}
              placeholder="e.g., Production, Staging, Development"
              className="w-full px-4 py-2 mb-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <label
              htmlFor={env2Id}
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Environment Variables
            </label>
            <textarea
              id={env2Id}
              value={env2}
              onChange={(e) => setEnv2(e.target.value)}
              className="w-full h-96 p-4 font-mono text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="DATABASE_URL=postgres://staging:5432/db&#10;API_KEY=staging-key&#10;DEBUG=true"
            />
          </div>
        </div>

        <div className="flex gap-4 mb-8">
          <button
            type="button"
            onClick={handleCompare}
            disabled={!env1.trim() || !env2.trim()}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Compare
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
          >
            Clear
          </button>
        </div>

        {result && (
          <div className="space-y-6">
            {result.summary.onlyInFirst > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-blue-900">
                    Only in {displayName1} ({result.summary.onlyInFirst})
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      copyKeys(result.onlyInFirst.map((item) => item.key))
                    }
                    className="px-4 py-1.5 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Copy Keys
                  </button>
                </div>
                <div className="space-y-2">
                  {result.onlyInFirst.map((item) => (
                    <div
                      key={item.key}
                      className="bg-white border border-blue-300 rounded p-3 font-mono text-sm"
                    >
                      <span className="font-medium text-gray-900">
                        {item.key}
                      </span>
                      <span className="text-gray-500 ml-2">=</span>
                      <span className="text-gray-700 ml-2">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.summary.onlyInSecond > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-purple-900">
                    Only in {displayName2} ({result.summary.onlyInSecond})
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      copyKeys(result.onlyInSecond.map((item) => item.key))
                    }
                    className="px-4 py-1.5 text-sm bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Copy Keys
                  </button>
                </div>
                <div className="space-y-2">
                  {result.onlyInSecond.map((item) => (
                    <div
                      key={item.key}
                      className="bg-white border border-purple-300 rounded p-3 font-mono text-sm"
                    >
                      <span className="font-medium text-gray-900">
                        {item.key}
                      </span>
                      <span className="text-gray-500 ml-2">=</span>
                      <span className="text-gray-700 ml-2">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.summary.identical > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-green-900 mb-4">
                  Identical Keys ({result.summary.identical})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {result.identical.map((item) => (
                    <div
                      key={item.key}
                      className="bg-white border border-green-300 rounded p-2 font-mono text-sm text-gray-900"
                    >
                      {item.key}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.summary.different > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-yellow-900 mb-4">
                  Different Values ({result.summary.different})
                </h2>
                <div className="space-y-2">
                  {result.differences.map((diff) => (
                    <div
                      key={diff.key}
                      className="bg-white border border-yellow-300 rounded p-3"
                    >
                      <div className="font-mono text-sm font-medium text-gray-900 mb-2">
                        {diff.key}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="bg-red-50 border border-red-200 rounded p-2">
                          <span className="text-red-700 font-medium">
                            {displayName1}:
                          </span>
                          <span className="ml-2 text-gray-900 font-mono">
                            {diff.value1}
                          </span>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded p-2">
                          <span className="text-green-700 font-medium">
                            {displayName2}:
                          </span>
                          <span className="ml-2 text-gray-900 font-mono">
                            {diff.value2}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.summary.total === 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <p className="text-gray-600">
                  No environment variables found to compare
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
