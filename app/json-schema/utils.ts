import { normalizeSchema } from "./normalize";
import type {
  JSONSchema,
  JSONSchemaProperty,
  ParsedSchema,
  PropertyConstraints,
  SchemaMetadata,
  SchemaNode,
  ExternalRefContext,
} from "./types";
import { SchemaCache } from "./schema-cache";

/**
 * Check if a $ref is external (relative file path) vs internal (JSON pointer)
 * Examples:
 *   External: "schemas/pod.json#/options", "definitions.json", "../common.json#/types"
 *   Internal: "#/definitions/Person", "#/$defs/User"
 */
function isExternalRef(ref: string): boolean {
  // Internal refs always start with #
  if (ref.startsWith("#")) {
    return false;
  }
  // External refs contain a path before # or no # at all
  return true;
}

/**
 * Build absolute URL from relative reference and base URL
 * @param ref - Relative path like "schemas/pod.json" or "../common.json"
 * @param baseUrl - Base URL like "https://example.com/path/to/"
 */
function resolveUrl(ref: string, baseUrl: string): string {
  // Remove fragment (#...) for URL resolution
  const [filePath] = ref.split("#");

  try {
    // Use URL API for proper resolution
    const base = new URL(baseUrl);
    const resolved = new URL(filePath, base);
    return resolved.href;
  } catch {
    // Fallback: simple concatenation
    const cleanBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    return `${cleanBase}${filePath}`;
  }
}

/**
 * Extract base URL from a full schema URL
 * "https://example.com/path/to/schema.json" → "https://example.com/path/to/"
 */
export function extractBaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/");
    pathParts.pop(); // Remove filename
    parsed.pathname = pathParts.join("/") + "/";
    return parsed.href;
  } catch {
    // Fallback: remove everything after last /
    const lastSlash = url.lastIndexOf("/");
    return lastSlash > 0 ? url.substring(0, lastSlash + 1) : url;
  }
}

/**
 * Fetch schema with cache integration
 */
async function fetchSchemaWithCache(
  url: string,
  cache: SchemaCache,
): Promise<JSONSchema> {
  // Check cache first
  const cached = cache.get(url);
  if (cached && !cache.isStale(url)) {
    return cached;
  }

  // Fetch from network
  const content = await fetchSchemaFromUrl(url);
  const schema = JSON.parse(content) as JSONSchema;

  // Store in cache (graceful failure)
  cache.set(url, schema);

  return schema;
}

export async function parseJSONSchema(
  input: string,
  baseUrl?: string,
  options?: {
    cache?: import("./schema-cache").SchemaCache;
    onProgress?: (current: number, total: number, url: string) => void;
  },
): Promise<ParsedSchema> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let schema: JSONSchema = {};

  try {
    // Try to parse as JSON
    const parsed = JSON.parse(input.trim());
    schema = parsed;
  } catch (error) {
    errors.push(
      `Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return {
      schema: {},
      errors,
      warnings,
      metadata: getEmptyMetadata(),
      ast: { kind: "primitive", type: "string", sourcePath: "root" },
    };
  }

  // Validate it looks like a JSON Schema
  if (!isValidSchema(schema)) {
    errors.push("Input does not appear to be a valid JSON Schema");
  }

  // Determine base URL for external refs
  let effectiveBaseUrl = baseUrl;
  if (!effectiveBaseUrl && schema.$id) {
    // Try to extract from $id
    effectiveBaseUrl = extractBaseUrl(schema.$id);
  }

  // Initialize external ref context if baseUrl is available
  let externalContext: ExternalRefContext | undefined;
  if (effectiveBaseUrl) {
    externalContext = {
      baseUrl: effectiveBaseUrl,
      cache: options?.cache || new SchemaCache(),
      fetchedUrls: new Set(),
      depth: 0,
      maxDepth: 5,
      maxFiles: 50,
      warnings: [],
      cacheHits: 0,
      cacheMisses: 0,
      onProgress: options?.onProgress,
    };
  }

  const metadata = analyzeSchema(schema);
  const ast = await normalizeSchema(schema, externalContext);

  // Collect warnings from external ref resolution
  if (externalContext) {
    warnings.push(...externalContext.warnings);
  }

  return {
    schema,
    errors,
    warnings,
    metadata,
    ast,
    externalRefs: externalContext
      ? Array.from(externalContext.fetchedUrls)
      : undefined,
    cacheHits: externalContext?.cacheHits,
    cacheMisses: externalContext?.cacheMisses,
  };
}

export async function fetchSchemaFromUrl(url: string): Promise<string> {
  try {
    const response = await fetch(
      `/api/fetch-schema?url=${encodeURIComponent(url)}`,
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch schema");
    }
    const data = await response.json();
    return data.content;
  } catch (error) {
    throw new Error(
      `Failed to fetch schema: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

function isValidSchema(schema: unknown): boolean {
  if (!schema || typeof schema !== "object") return false;

  // Check for common JSON Schema identifiers
  if (schema.$schema && typeof schema.$schema === "string") return true;
  if (schema.$id && typeof schema.$id === "string") return true;
  if (
    schema.type &&
    (typeof schema.type === "string" || Array.isArray(schema.type))
  )
    return true;
  if (schema.properties && typeof schema.properties === "object") return true;
  if (schema.definitions && typeof schema.definitions === "object") return true;
  if (schema.$defs && typeof schema.$defs === "object") return true;

  return false;
}

function analyzeSchema(schema: JSONSchema): SchemaMetadata {
  const metadata: SchemaMetadata = {
    totalProperties: 0,
    requiredProperties: 0,
    optionalProperties: 0,
    nestedObjects: 0,
    arrays: 0,
    enums: 0,
    references: 0,
    depth: 0,
    types: {},
  };

  function analyzeNode(node: JSONSchemaProperty, depth: number = 0): void {
    metadata.depth = Math.max(metadata.depth, depth);

    // Count types
    const types = Array.isArray(node.type)
      ? node.type
      : [node.type].filter((t): t is string => Boolean(t));
    types.forEach((type) => {
      metadata.types[type] = (metadata.types[type] || 0) + 1;
    });

    // Count properties
    if (node.properties) {
      Object.keys(node.properties).forEach((key) => {
        metadata.totalProperties++;
        const prop = node.properties?.[key];
        if (prop) {
          analyzeNode(prop, depth + 1);
        }
      });
    }

    // Count required
    if (Array.isArray(node.required)) {
      metadata.requiredProperties += node.required.length;
    }

    // Count nested objects
    if (node.type === "object" && node.properties) {
      metadata.nestedObjects++;
    }

    // Count arrays
    if (node.type === "array" || node.items) {
      metadata.arrays++;
      if (node.items) {
        analyzeNode(node.items, depth + 1);
      }
    }

    // Count enums
    if (node.enum) {
      metadata.enums++;
    }

    // Count references
    if (node.$ref) {
      metadata.references++;
    }

    // Analyze nested schemas
    ["anyOf", "allOf", "oneOf"].forEach((key) => {
      const schemas = (node as Record<string, unknown>)[key];
      if (Array.isArray(schemas)) {
        schemas.forEach((s: JSONSchemaProperty) => {
          analyzeNode(s, depth + 1);
        });
      }
    });

    if (node.not) {
      analyzeNode(node.not, depth + 1);
    }

    if (typeof node.additionalProperties === "object") {
      analyzeNode(node.additionalProperties, depth + 1);
    }
  }

  // Also analyze definitions/$defs
  ["definitions", "$defs"].forEach((key) => {
    const defs = (schema as Record<string, unknown>)[key];
    if (defs && typeof defs === "object") {
      for (const def of Object.values(defs) as JSONSchemaProperty[]) {
        analyzeNode(def, 1);
      }
    }
  });

  analyzeNode(schema as JSONSchemaProperty);
  metadata.optionalProperties =
    metadata.totalProperties - metadata.requiredProperties;

  return metadata;
}

function buildSchemaTree(schema: JSONSchema): SchemaNode {
  const resolvedSchema = resolveReferences(
    schema as JSONSchemaProperty,
    schema,
  );
  return {
    name: schema.title || "root",
    path: "",
    type: schema.type || "object",
    description: schema.description,
    children: buildChildren(resolvedSchema as JSONSchemaProperty, "", schema),
  };
}

function buildChildren(
  node: JSONSchemaProperty,
  basePath: string,
  rootSchema: JSONSchema,
): SchemaNode[] {
  const children: SchemaNode[] = [];

  if (node.properties) {
    Object.entries(node.properties).forEach(([key, prop]) => {
      const path = basePath ? `${basePath}.${key}` : key;
      const childNode = buildPropertyNode(key, path, prop, rootSchema);
      children.push(childNode);
    });
  }

  // Handle combined schemas
  ["anyOf", "allOf", "oneOf"].forEach((combiner) => {
    const schemas = (node as Record<string, unknown>)[combiner];
    if (Array.isArray(schemas)) {
      schemas.forEach((schema: JSONSchemaProperty, index: number) => {
        const name = `${combiner}[${index}]`;
        const path = basePath ? `${basePath}.${name}` : name;
        const childNode = buildPropertyNode(name, path, schema, rootSchema);
        children.push(childNode);
      });
    }
  });

  return children;
}

function buildPropertyNode(
  name: string,
  path: string,
  prop: JSONSchemaProperty,
  rootSchema: JSONSchema,
): SchemaNode {
  // Resolve $ref before creating node
  const resolvedProp = prop.$ref
    ? resolveReferences(prop, rootSchema, new Set())
    : prop;

  // Cast to JSONSchemaProperty since we're working with property schemas
  const propertySchema = resolvedProp as JSONSchemaProperty;

  const node: SchemaNode = {
    name,
    path,
    type: propertySchema.type || "unknown",
    required: false, // Will be determined by parent
    description: propertySchema.description,
    enum: propertySchema.enum,
    defaultValue: propertySchema.default,
    constraints: getConstraints(propertySchema),
  };

  // Build children recursively with resolved schema
  node.children = buildChildren(propertySchema, path, rootSchema);

  return node;
}

function getConstraints(
  prop: JSONSchemaProperty,
): PropertyConstraints | undefined {
  const constraints: PropertyConstraints = {};

  // Only check constraints if not a $ref
  if (!prop.$ref) {
    if (prop.minimum !== undefined) constraints.minimum = prop.minimum;
    if (prop.maximum !== undefined) constraints.maximum = prop.maximum;
    if (prop.minLength !== undefined) constraints.minLength = prop.minLength;
    if (prop.maxLength !== undefined) constraints.maxLength = prop.maxLength;
    if (prop.pattern !== undefined) constraints.pattern = prop.pattern;
    if (prop.format !== undefined) constraints.format = prop.format;
    if (typeof prop.items === "object") {
      const items = prop.items as any;
      if (items.minItems !== undefined) constraints.minItems = items.minItems;
      if (items.maxItems !== undefined) constraints.maxItems = items.maxItems;
      if (items.uniqueItems !== undefined)
        constraints.uniqueItems = items.uniqueItems;
    }
  }

  return Object.keys(constraints).length > 0 ? constraints : undefined;
}

/**
 * Resolve external reference and recursively resolve nested refs
 */
async function resolveExternalReference(
  ref: string,
  rootSchema: JSONSchema,
  context: ExternalRefContext,
): Promise<JSONSchema | JSONSchemaProperty> {
  // Safety checks
  if (context.depth >= context.maxDepth) {
    const warning = `Max external ref depth (${context.maxDepth}) exceeded for ${ref}`;
    context.warnings.push(warning);
    return { type: "object", description: `[${warning}]` };
  }

  if (context.fetchedUrls.size >= context.maxFiles) {
    const warning = `Max external files (${context.maxFiles}) exceeded at ${ref}`;
    context.warnings.push(warning);
    return { type: "object", description: `[${warning}]` };
  }

  try {
    // Parse: "schemas/pod.json#/options" → file + pointer
    const [filePath, pointer = ""] = ref.split("#");
    const absoluteUrl = resolveUrl(filePath, context.baseUrl);

    // Fetch with cache
    let externalSchema: JSONSchema;
    const isCached =
      context.cache.has(absoluteUrl) && !context.cache.isStale(absoluteUrl);

    if (isCached) {
      externalSchema = context.cache.get(absoluteUrl)!;
      context.cacheHits++;
    } else {
      externalSchema = await fetchSchemaWithCache(absoluteUrl, context.cache);
      context.fetchedUrls.add(absoluteUrl);
      context.cacheMisses++;
    }

    // Report progress
    if (context.onProgress) {
      context.onProgress(
        context.fetchedUrls.size,
        context.maxFiles,
        absoluteUrl,
      );
    }

    // Resolve JSON pointer within external schema
    const resolved = pointer
      ? resolveJsonPointer(`#${pointer}`, externalSchema)
      : externalSchema;

    if (!resolved) {
      const warning = `Failed to resolve pointer ${pointer} in ${absoluteUrl}`;
      context.warnings.push(warning);
      return { type: "object", description: `[${warning}]` };
    }

    // Recursively resolve if external schema has more refs
    const nestedContext: ExternalRefContext = {
      ...context,
      baseUrl: extractBaseUrl(absoluteUrl), // Update base for relative refs
      depth: context.depth + 1,
    };

    return await resolveReferences(
      resolved,
      externalSchema,
      new Set(),
      nestedContext,
    );
  } catch (error) {
    const warning = `Failed to fetch external ref ${ref}: ${error instanceof Error ? error.message : "Unknown error"}`;
    context.warnings.push(warning);
    return { type: "object", description: `[${warning}]` };
  }
}

export async function resolveReferences(
  schema: JSONSchema | JSONSchemaProperty,
  rootSchema: JSONSchema,
  visited: Set<string> = new Set(),
  context?: ExternalRefContext,
): Promise<JSONSchema | JSONSchemaProperty> {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  // Handle $ref
  const ref = (schema as any).$ref;
  if (ref) {
    // Prevent infinite loops - check if we're currently resolving this ref in our call stack
    if (visited.has(ref)) {
      return { type: "object", description: "[Circular reference detected]" };
    }

    // Create a new Set for this branch to avoid false positives across different branches
    const newVisited = new Set(visited);
    newVisited.add(ref);

    // Route: external vs internal
    if (isExternalRef(ref) && context) {
      // External reference
      return await resolveExternalReference(ref, rootSchema, context);
    } else {
      // Internal reference
      try {
        const resolved = resolveJsonPointer(ref, rootSchema);
        if (resolved) {
          return await resolveReferences(
            resolved,
            rootSchema,
            newVisited,
            context,
          );
        }
      } catch (error) {
        const warning = `Failed to resolve internal $ref ${ref}: ${error instanceof Error ? error.message : "Unknown error"}`;
        if (context) {
          context.warnings.push(warning);
        }
        return {
          type: "object",
          description: `[${warning}]`,
        };
      }
    }
  }

  // Handle combined schemas
  const resolvedSchema = { ...schema };

  // Recursively resolve references in nested properties
  // Each property gets its own branch, so we pass the current visited set
  if (resolvedSchema.properties) {
    const resolvedProperties: Record<string, JSONSchemaProperty> = {};
    for (const [key, prop] of Object.entries(resolvedSchema.properties)) {
      resolvedProperties[key] = (await resolveReferences(
        prop,
        rootSchema,
        visited, // Pass current visited, each property is a separate branch
        context,
      )) as JSONSchemaProperty;
    }
    resolvedSchema.properties = resolvedProperties;
  }

  // Resolve references in arrays
  if (resolvedSchema.items) {
    resolvedSchema.items = (await resolveReferences(
      resolvedSchema.items,
      rootSchema,
      visited, // Pass current visited
      context,
    )) as JSONSchemaProperty;
  }

  // Resolve references in combined schemas
  for (const key of ["anyOf", "allOf", "oneOf"]) {
    const schemas = (resolvedSchema as any)[key];
    if (Array.isArray(schemas)) {
      const resolvedArray: JSONSchemaProperty[] = [];
      for (const s of schemas) {
        resolvedArray.push(
          (await resolveReferences(
            s,
            rootSchema,
            visited,
            context,
          )) as JSONSchemaProperty,
        );
      }
      (resolvedSchema as any)[key] = resolvedArray;
    }
  }

  if (resolvedSchema.not) {
    resolvedSchema.not = (await resolveReferences(
      resolvedSchema.not,
      rootSchema,
      visited, // Pass current visited
      context,
    )) as JSONSchemaProperty;
  }

  if (typeof resolvedSchema.additionalProperties === "object") {
    resolvedSchema.additionalProperties = (await resolveReferences(
      resolvedSchema.additionalProperties as JSONSchemaProperty,
      rootSchema,
      visited, // Pass current visited
      context,
    )) as JSONSchemaProperty;
  }

  return resolvedSchema;
}

function resolveJsonPointer(
  pointer: string,
  schema: JSONSchema,
): JSONSchema | null {
  // Remove the initial # if present
  const cleanPointer = pointer.startsWith("#") ? pointer.slice(1) : pointer;

  if (!cleanPointer) {
    return schema;
  }

  const parts = cleanPointer.split("/").filter((part) => part);
  let current: any = schema;

  for (const part of parts) {
    if (current === null || typeof current !== "object") {
      return null;
    }

    // Handle JSON Pointer array notation
    if (part.startsWith("0") && /^\d+$/.test(part)) {
      const index = parseInt(part, 10);
      if (Array.isArray(current) && index < current.length) {
        current = current[index];
      } else {
        return null;
      }
    } else {
      current = current[part];
    }
  }

  return current;
}

function getEmptyMetadata(): SchemaMetadata {
  return {
    totalProperties: 0,
    requiredProperties: 0,
    optionalProperties: 0,
    nestedObjects: 0,
    arrays: 0,
    enums: 0,
    references: 0,
    depth: 0,
    types: {},
  };
}
