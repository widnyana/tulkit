"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { NodeRenderer } from "./components/NodeRenderer";
import { SchemaStats } from "./components/SchemaStats";
import { SchemaCache } from "./schema-cache";
import type { ParsedSchema } from "./types";
import { extractBaseUrl, fetchSchemaFromUrl, parseJSONSchema } from "./utils";

const EXAMPLE_SCHEMAS = [
  {
    name: "bjw-s' app-template schema",
    url: "https://raw.githubusercontent.com/bjw-s-labs/helm-charts/common-4.5.0/charts/library/common/values.schema.json",
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
          console.log(`got error: ${error}`);
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
      console.log(`got error: ${error}`);
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
    <TooltipProvider>
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors"
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
            <h1 className="text-3xl font-bold text-foreground mb-2">
              JSON Schema Visualizer
            </h1>
            <p className="text-muted-foreground">
              Visualize and explore JSON Schema structures with interactive tree
              view and statistics
            </p>
          </header>

          {/* Example Schemas */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Quick Examples</CardTitle>
              <CardDescription>
                Click on any example to load it instantly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {EXAMPLE_SCHEMAS.map((example) => (
                  <Button
                    key={example.name}
                    variant="outline"
                    onClick={() => handleExampleClick(example)}
                    className="h-auto p-3 justify-start text-left flex-col items-start gap-2 min-h-[100px]"
                  >
                    <div className="flex items-start justify-between w-full gap-2 min-w-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <h3 className="font-semibold text-sm leading-tight truncate text-left w-full">
                            {example.name}
                          </h3>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">{example.name}</p>
                        </TooltipContent>
                      </Tooltip>
                      <span className="text-xs text-primary font-medium whitespace-nowrap flex-shrink-0">
                        {example.url ? "URL" : "JSON"}
                      </span>
                    </div>
                    {example.url && (
                      <div className="w-full min-w-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-xs text-muted-foreground font-mono truncate text-left w-full">
                              {example.url}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs break-all">{example.url}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Input Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Input Schema</CardTitle>
              <CardDescription>
                Provide a URL or paste JSON schema content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                value={inputMode}
                onValueChange={(value) => setInputMode(value as "url" | "json")}
              >
                <TabsList>
                  <TabsTrigger value="url">URL</TabsTrigger>
                  <TabsTrigger value="json">JSON</TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="space-y-4">
                  <div>
                    <label
                      htmlFor={urlId}
                      className="block text-sm font-medium mb-2"
                    >
                      Schema URL
                    </label>
                    <Input
                      id={urlId}
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/schema.json"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="json" className="space-y-4">
                  <div>
                    <label
                      htmlFor={jsonId}
                      className="block text-sm font-medium mb-2"
                    >
                      JSON Schema Content
                    </label>
                    <Textarea
                      id={jsonId}
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      placeholder='{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", ...}'
                      className="min-h-[200px] font-mono text-sm"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-4 mt-6">
                <Button onClick={handleLoadSchema} disabled={isLoading}>
                  {isLoading ? "Loading..." : "Visualize Schema"}
                </Button>
                <Button variant="outline" onClick={handleClear}>
                  Clear
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleClearCache}
                  title="Clear cached external schemas"
                >
                  Clear Cache
                </Button>
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
            </CardContent>
          </Card>

          {/* Results */}
          {parsedSchema && (
            <div className="space-y-6">
              {!zenMode && <SchemaStats metadata={parsedSchema.metadata} />}

              {/* Cache Stats */}
              {!zenMode &&
                parsedSchema.externalRefs &&
                parsedSchema.externalRefs.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>External Schema Cache</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="text-sm text-blue-600 mb-1">
                            External Schemas
                          </div>
                          <div className="text-2xl font-bold text-blue-900">
                            {parsedSchema.externalRefs.length}
                          </div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="text-sm text-green-600 mb-1">
                            Cache Hits
                          </div>
                          <div className="text-2xl font-bold text-green-900">
                            {parsedSchema.cacheHits || 0}
                          </div>
                        </div>
                        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="text-sm text-orange-600 mb-1">
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
                                  ... and {parsedSchema.warnings.length - 5}{" "}
                                  more
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                )}

              <Card className={`${zenMode ? "fixed inset-4 z-50" : ""}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Schema Structure</CardTitle>
                    <Button
                      variant={zenMode ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setZenMode(!zenMode)}
                    >
                      {zenMode ? "✕ Exit Zen" : "🧘 Zen Mode"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    className={`border rounded-lg p-4 overflow-y-auto bg-background ${
                      zenMode ? "h-[calc(100vh-160px)]" : "max-h-[1000px]"
                    }`}
                  >
                    <NodeRenderer node={parsedSchema.ast} />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
