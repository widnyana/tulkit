"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { NodeRenderer } from "./components/NodeRenderer";
import { SchemaStats } from "./components/SchemaStats";
import { SchemaCache } from "./schema-cache";
import type { ParsedSchema } from "./types";
import { extractBaseUrl, fetchSchemaFromUrl, parseJSONSchema } from "./utils";

const EXAMPLE_SCHEMAS = [
  {
    name: "Core schema meta-schema",
    url: "https://json-schema.org/draft-07/schema",
    schema: "",
  },
  {
    name: "Tauri config schema",
    url: "https://schema.tauri.app/config/2",
    schema: "",
  },
  {
    name: "API Response",
    url: "",
    schema: JSON.stringify(
      {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "object",
        properties: {
          data: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                type: { type: "string" },
                attributes: {
                  type: "object",
                  additionalProperties: true,
                },
              },
            },
          },
          meta: {
            type: "object",
            properties: {
              total: { type: "integer" },
              page: { type: "integer" },
              totalPages: { type: "integer" },
            },
          },
        },
      },
      null,
      2,
    ),
  },
  {
    name: "Event with Discriminator (oneOf + allOf)",
    url: "",
    schema: JSON.stringify(
      {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "object",
        required: ["id", "timestamp"],
        properties: {
          id: { type: "string" },
          timestamp: { type: "string", format: "date-time" },
        },
        oneOf: [
          {
            properties: {
              type: { const: "user.created" },
              payload: {
                type: "object",
                required: ["username", "email"],
                properties: {
                  username: { type: "string" },
                  email: { type: "string", format: "email" },
                },
              },
            },
          },
          {
            properties: {
              type: { const: "user.deleted" },
              payload: {
                type: "object",
                required: ["userId"],
                properties: {
                  userId: { type: "string" },
                  reason: { type: "string" },
                },
              },
            },
          },
          {
            properties: {
              type: { const: "payment.succeeded" },
              payload: {
                type: "object",
                required: ["amount", "currency"],
                properties: {
                  amount: { type: "number" },
                  currency: { type: "string", enum: ["USD", "EUR", "GBP"] },
                },
              },
            },
          },
        ],
      },
      null,
      2,
    ),
  },
];

export default function JSONSchemaPage() {
  const [inputMode, setInputMode] = useState<"url" | "json">("url");
  const [url, setUrl] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [parsedSchema, setParsedSchema] = useState<ParsedSchema | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<{
    stage: "idle" | "main" | "external" | "parsing" | "complete";
    current?: number;
    total?: number;
    message?: string;
  }>({ stage: "idle" });
  const [cacheInstance] = useState(() => new SchemaCache());

  const urlId = useId();
  const jsonId = useId();

  // Escape key handler to exit zen mode
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && zenMode) {
        setZenMode(false);
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [zenMode]);

  const handleLoadSchema = async () => {
    setIsLoading(true);
    setParsedSchema(null);
    setLoadingProgress({ stage: "main", message: "Fetching schema..." });

    try {
      let schemaContent = "";

      if (inputMode === "url") {
        if (!url.trim()) {
          toast.error("Please enter a URL");
          setIsLoading(false);
          setLoadingProgress({ stage: "idle" });
          return;
        }
        schemaContent = await fetchSchemaFromUrl(url.trim());

        // Check response size to prevent memory issues
        if (schemaContent.length > 5000000) {
          // 500KB limit
          toast.error("Schema content too large. Please use a smaller schema.");
          setIsLoading(false);
          setLoadingProgress({ stage: "idle" });
          return;
        }
      } else {
        if (!jsonInput.trim()) {
          toast.error("Please enter JSON schema content");
          setIsLoading(false);
          setLoadingProgress({ stage: "idle" });
          return;
        }

        // Check input size to prevent memory issues
        if (jsonInput.length > 5000000) {
          // 500KB limit
          toast.error("Schema content too large. Please use a smaller schema.");
          setIsLoading(false);
          setLoadingProgress({ stage: "idle" });
          return;
        }

        schemaContent = jsonInput;
      }

      // Determine base URL for external refs
      let baseUrl: string | undefined;
      if (inputMode === "url") {
        baseUrl = extractBaseUrl(url.trim());
      } else {
        // Try to extract from $id in JSON
        try {
          const schemaObj = JSON.parse(schemaContent);
          if (schemaObj.$id) {
            baseUrl = extractBaseUrl(schemaObj.$id);
          }
        } catch {
          // Ignore parsing error, will be handled by parseJSONSchema
        }
      }

      // Progress callback for external schema fetching
      const handleProgress = (current: number, total: number, _url: string) => {
        setLoadingProgress({
          stage: "external",
          current,
          total,
          message: `Fetching external schemas (${current}/${total})...`,
        });
        console.info(`fetching ${url}`);
      };

      setLoadingProgress({ stage: "parsing", message: "Parsing schema..." });
      const parsed = await parseJSONSchema(schemaContent, baseUrl, {
        cache: cacheInstance,
        onProgress: handleProgress,
      });
      setParsedSchema(parsed);
      setLoadingProgress({ stage: "complete" });

      if (parsed.errors.length > 0) {
        parsed.errors.forEach((error: string) => {
          toast.error(error);
        });
      } else if (parsed.warnings && parsed.warnings.length > 0) {
        toast.warning(`Schema loaded with ${parsed.warnings.length} warnings`);
      } else {
        toast.success("Schema loaded successfully!");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load schema",
      );
      setLoadingProgress({ stage: "idle" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (example: (typeof EXAMPLE_SCHEMAS)[0]) => {
    if (example.url) {
      setInputMode("url");
      setUrl(example.url);
      setJsonInput("");
    } else if (example.schema) {
      setInputMode("json");
      setJsonInput(example.schema);
      setUrl("");
    }
  };

  const handleClear = () => {
    setUrl("");
    setJsonInput("");
    setParsedSchema(null);
  };

  const handleClearCache = () => {
    cacheInstance.clear();
    toast.success("Cache cleared successfully!");
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
            JSON Schema Visualizer
          </h1>
          <p className="text-gray-600">
            Visualize and explore JSON Schema structures with interactive tree
            view and statistics
          </p>
        </header>

        {/* Example Schemas */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Examples
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {EXAMPLE_SCHEMAS.map((example) => (
              <button
                key={example.name}
                type="button"
                onClick={() => handleExampleClick(example)}
                className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
              >
                <div className="font-medium text-gray-900">{example.name}</div>
                {example.url && (
                  <div className="text-sm text-gray-500 mt-1 truncate">
                    {example.url}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Input Schema
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setInputMode("url")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  inputMode === "url"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                URL
              </button>
              <button
                type="button"
                onClick={() => setInputMode("json")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  inputMode === "json"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                JSON
              </button>
            </div>
          </div>

          {inputMode === "url" ? (
            <div>
              <label
                htmlFor={urlId}
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Schema URL
              </label>
              <input
                id={urlId}
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/schema.json"
                className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          ) : (
            <div>
              <label
                htmlFor={jsonId}
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                JSON Schema Content
              </label>
              <textarea
                id={jsonId}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", ...}'
                className="w-full h-64 p-4 font-mono text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          <div className="flex gap-4 mt-6">
            <button
              type="button"
              onClick={handleLoadSchema}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Loading..." : "Visualize Schema"}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleClearCache}
              className="px-6 py-2 bg-orange-100 text-orange-700 font-medium rounded-lg hover:bg-orange-200 transition-colors"
              title="Clear cached external schemas"
            >
              Clear Cache
            </button>
          </div>

          {/* Progress Indicator */}
          {loadingProgress.stage !== "idle" &&
            loadingProgress.stage !== "complete" && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                  <span className="text-sm text-blue-900 font-medium">
                    {loadingProgress.message}
                  </span>
                </div>
              </div>
            )}
        </div>

        {/* Results */}
        {parsedSchema && (
          <div className="space-y-6">
            {!zenMode && <SchemaStats metadata={parsedSchema.metadata} />}

            {/* Cache Stats */}
            {!zenMode &&
              parsedSchema.externalRefs &&
              parsedSchema.externalRefs.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    External Schema Cache
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">
                        External Schemas
                      </div>
                      <div className="text-2xl font-bold text-blue-900">
                        {parsedSchema.externalRefs.length}
                      </div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">
                        Cache Hits
                      </div>
                      <div className="text-2xl font-bold text-green-900">
                        {parsedSchema.cacheHits || 0}
                      </div>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">
                        Cache Misses
                      </div>
                      <div className="text-2xl font-bold text-orange-900">
                        {parsedSchema.cacheMisses || 0}
                      </div>
                    </div>
                  </div>
                  {parsedSchema.warnings &&
                    parsedSchema.warnings.length > 0 && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="text-sm font-medium text-yellow-900 mb-2">
                          Warnings ({parsedSchema.warnings.length})
                        </div>
                        <ul className="text-sm text-yellow-800 space-y-1">
                          {parsedSchema.warnings
                            .slice(0, 5)
                            .map((warning) => (
                              <li key={warning} className="truncate">
                                {warning}
                              </li>
                            ))}
                          {parsedSchema.warnings.length > 5 && (
                            <li className="italic">
                              ... and {parsedSchema.warnings.length - 5} more
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                </div>
              )}

            <div
              className={`bg-white rounded-lg shadow-lg p-6 border border-gray-200 ${zenMode ? "fixed inset-4 z-50" : ""}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Schema Structure
                </h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setZenMode(!zenMode)}
                    className={`px-3 py-1.5 text-sm rounded transition-colors ${
                      zenMode
                        ? "bg-purple-600 text-white hover:bg-purple-700"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                    title={zenMode ? "Exit Zen Mode" : "Enter Zen Mode"}
                  >
                    {zenMode ? "✕ Exit Zen" : "🧘 Zen Mode"}
                  </button>
                </div>
              </div>
              <div
                className={`border border-gray-200 rounded-lg p-4 overflow-y-auto bg-white ${
                  zenMode ? "h-[calc(100vh-160px)]" : "max-h-[1000px]"
                }`}
              >
                <NodeRenderer node={parsedSchema.ast} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
