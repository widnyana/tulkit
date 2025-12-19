/**
 * Schema normalization engine: JSON Schema → Logical AST
 *
 * Converts raw JSON Schema into an explicit AST that separates:
 * - Structure (object/array/primitive)
 * - Logic operators (allOf/anyOf/oneOf/not)
 *
 * This makes implicit semantics explicit and enables correct rendering.
 */

import type {
  AndNode,
  ArrayNode,
  ASTNode,
  Constraint,
  NotNode,
  ObjectNode,
  OrNode,
  PrimitiveNode,
  XorNode,
} from "./ast-types";
import { detectDiscriminator } from "./discriminator-detection";
import type {
  ExternalRefContext,
  JSONSchema,
  JSONSchemaProperty,
} from "./types";
import { resolveReferences } from "./utils";

/**
 * Type guard to check if schema is a JSONSchemaProperty
 */
function isJSONSchemaProperty(
  schema: JSONSchema | JSONSchemaProperty,
): schema is JSONSchemaProperty {
  return (
    !("$ref" in schema) ||
    ("required" in schema && typeof schema.required === "boolean")
  );
}

/**
 * Type guard to check if schema is a JSONSchema
 */
function _isJSONSchema(
  schema: JSONSchema | JSONSchemaProperty,
): schema is JSONSchema {
  return (
    ("required" in schema && Array.isArray(schema.required)) ||
    "definitions" in schema ||
    "$defs" in schema
  );
}

/**
 * Normalize a JSON Schema into an AST.
 * Entry point for the normalization algorithm.
 */
export async function normalizeSchema(
  schema: JSONSchema,
  context?: ExternalRefContext,
): Promise<ASTNode> {
  return await normalizeNode(schema, schema, new Set(), "", context);
}

/**
 * Normalize a schema node recursively.
 *
 * @param node - Current schema node
 * @param rootSchema - Root schema (for $ref resolution)
 * @param visited - Set of visited $ref paths (circular detection)
 * @param sourcePath - Path in original schema (for debugging)
 * @param context - External ref context (optional)
 */
async function normalizeNode(
  node: JSONSchemaProperty | JSONSchema,
  rootSchema: JSONSchema,
  visited: Set<string>,
  sourcePath: string,
  context?: ExternalRefContext,
): Promise<ASTNode> {
  // Step 1: Resolve $ref
  // Delegate all circular detection to resolveReferences()
  let resolved = node;
  if (node.$ref) {
    resolved = await resolveReferences(node, rootSchema, visited, context);
  }

  // Step 2: Lift logic keywords
  const logicNodes: ASTNode[] = [];

  if (resolved.allOf && Array.isArray(resolved.allOf)) {
    logicNodes.push(
      await createAndNode(
        resolved.allOf,
        rootSchema,
        visited,
        sourcePath,
        context,
      ),
    );
  }

  if (resolved.anyOf && Array.isArray(resolved.anyOf)) {
    logicNodes.push(
      await createOrNode(
        resolved.anyOf,
        rootSchema,
        visited,
        sourcePath,
        context,
      ),
    );
  }

  if (resolved.oneOf && Array.isArray(resolved.oneOf)) {
    logicNodes.push(
      await createXorNode(
        resolved.oneOf,
        rootSchema,
        visited,
        sourcePath,
        context,
      ),
    );
  }

  if (resolved.not) {
    logicNodes.push(
      await createNotNode(
        resolved.not,
        rootSchema,
        visited,
        sourcePath,
        context,
      ),
    );
  }

  // Step 3: Extract structure
  const structureNode = await extractStructure(
    resolved,
    rootSchema,
    visited,
    sourcePath,
    context,
  );

  // Step 4: Composition rule
  // If both structure and logic exist, wrap in AND
  if (structureNode && logicNodes.length > 0) {
    return {
      kind: "and",
      nodes: [structureNode, ...logicNodes],
      description: resolved.description,
      sourcePath,
    };
  }

  if (structureNode) {
    return structureNode;
  }

  if (logicNodes.length === 1) {
    return logicNodes[0];
  }

  if (logicNodes.length > 1) {
    // Multiple logic operators - wrap in AND
    return {
      kind: "and",
      nodes: logicNodes,
      description: resolved.description,
      sourcePath,
    };
  }

  // Fallback: treat as unknown primitive
  return createPrimitiveNode(
    "string",
    isJSONSchemaProperty(resolved)
      ? resolved
      : (resolved as JSONSchemaProperty),
    sourcePath,
  );
}

/**
 * Extract structural schema (object/array/primitive)
 */
async function extractStructure(
  schema: JSONSchemaProperty | JSONSchema,
  rootSchema: JSONSchema,
  visited: Set<string>,
  sourcePath: string,
  context?: ExternalRefContext,
): Promise<ASTNode | null> {
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];

  // Object type
  if (types.includes("object") || schema.properties) {
    return await createObjectNode(
      isJSONSchemaProperty(schema) ? schema : (schema as JSONSchemaProperty),
      rootSchema,
      visited,
      sourcePath,
      context,
    );
  }

  // Array type
  if (types.includes("array") || schema.items) {
    return await createArrayNode(
      isJSONSchemaProperty(schema) ? schema : (schema as JSONSchemaProperty),
      rootSchema,
      visited,
      sourcePath,
      context,
    );
  }

  // Primitive types
  if (
    types.some((t) =>
      ["string", "number", "integer", "boolean", "null"].includes(t as string),
    )
  ) {
    const primitiveType = types.find((t) =>
      ["string", "number", "integer", "boolean", "null"].includes(t as string),
    ) as "string" | "number" | "integer" | "boolean" | "null";
    return createPrimitiveNode(
      primitiveType,
      isJSONSchemaProperty(schema) ? schema : (schema as JSONSchemaProperty),
      sourcePath,
    );
  }

  // Primitive types
  if (
    types.some((t) =>
      ["string", "number", "integer", "boolean", "null"].includes(t as string),
    )
  ) {
    const primitiveType = types.find((t) =>
      ["string", "number", "integer", "boolean", "null"].includes(t as string),
    ) as "string" | "number" | "integer" | "boolean" | "null";
    return createPrimitiveNode(
      primitiveType,
      isJSONSchemaProperty(schema) ? schema : (schema as JSONSchemaProperty),
      sourcePath,
    );
  }

  // Has enum or const without explicit type
  if (schema.enum || schema.const !== undefined) {
    return createPrimitiveNode(
      "string",
      isJSONSchemaProperty(schema) ? schema : (schema as JSONSchemaProperty),
      sourcePath,
    );
  }

  return null;
}

/**
 * Create AndNode from allOf
 */
async function createAndNode(
  schemas: JSONSchemaProperty[],
  rootSchema: JSONSchema,
  visited: Set<string>,
  sourcePath: string,
  context?: ExternalRefContext,
): Promise<AndNode> {
  const nodePromises = schemas.map((schema, index) =>
    normalizeNode(
      schema,
      rootSchema,
      visited,
      `${sourcePath}/allOf[${index}]`,
      context,
    ),
  );
  const nodes = await Promise.all(nodePromises);

  // Step 5: Flatten nested ANDs
  const flattenedNodes: ASTNode[] = [];
  nodes.forEach((node) => {
    if (node.kind === "and") {
      flattenedNodes.push(...node.nodes);
    } else {
      flattenedNodes.push(node);
    }
  });

  return {
    kind: "and",
    nodes: flattenedNodes,
    sourcePath,
  };
}

/**
 * Create OrNode from anyOf
 */
async function createOrNode(
  schemas: JSONSchemaProperty[],
  rootSchema: JSONSchema,
  visited: Set<string>,
  sourcePath: string,
  context?: ExternalRefContext,
): Promise<OrNode> {
  const nodePromises = schemas.map((schema, index) =>
    normalizeNode(
      isJSONSchemaProperty(schema) ? schema : (schema as JSONSchemaProperty),
      rootSchema,
      visited,
      `${sourcePath}/anyOf[${index}]`,
      context,
    ),
  );
  const nodes = await Promise.all(nodePromises);

  // Step 5: Flatten nested ORs
  const flattenedNodes: ASTNode[] = [];
  nodes.forEach((node) => {
    if (node.kind === "or") {
      flattenedNodes.push(...node.nodes);
    } else {
      flattenedNodes.push(node);
    }
  });

  return {
    kind: "or",
    nodes: flattenedNodes,
    sourcePath,
  };
}

/**
 * Create XorNode from oneOf
 */
async function createXorNode(
  schemas: JSONSchemaProperty[],
  rootSchema: JSONSchema,
  visited: Set<string>,
  sourcePath: string,
  context?: ExternalRefContext,
): Promise<XorNode> {
  const nodePromises = schemas.map((schema, index) =>
    normalizeNode(
      schema,
      rootSchema,
      visited,
      `${sourcePath}/oneOf[${index}]`,
      context,
    ),
  );
  const nodes = await Promise.all(nodePromises);

  // Step 6: Attach discriminator
  const discriminator = detectDiscriminator(schemas);

  return {
    kind: "xor",
    nodes,
    discriminator,
    sourcePath,
  };
}

/**
 * Create NotNode from not
 */
async function createNotNode(
  schema: JSONSchemaProperty,
  rootSchema: JSONSchema,
  visited: Set<string>,
  sourcePath: string,
  context?: ExternalRefContext,
): Promise<NotNode> {
  return {
    kind: "not",
    node: await normalizeNode(
      schema,
      rootSchema,
      visited,
      `${sourcePath}/not`,
      context,
    ),
    sourcePath,
  };
}

/**
 * Create ObjectNode
 */
async function createObjectNode(
  schema: JSONSchemaProperty | JSONSchema,
  rootSchema: JSONSchema,
  visited: Set<string>,
  sourcePath: string,
  context?: ExternalRefContext,
): Promise<ObjectNode> {
  const properties: Record<string, ASTNode> = {};

  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      properties[key] = await normalizeNode(
        prop,
        rootSchema,
        visited,
        `${sourcePath}/properties/${key}`,
        context,
      );
    }
  }

  const required = new Set<string>(
    Array.isArray(schema.required) ? schema.required : [],
  );

  let additionalProperties: boolean | ASTNode | undefined;
  if (schema.additionalProperties !== undefined) {
    if (typeof schema.additionalProperties === "boolean") {
      additionalProperties = schema.additionalProperties;
    } else {
      additionalProperties = await normalizeNode(
        schema.additionalProperties,
        rootSchema,
        visited,
        `${sourcePath}/additionalProperties`,
        context,
      );
    }
  }

  return {
    kind: "object",
    properties,
    required,
    additionalProperties,
    description: schema.description,
    sourcePath,
  };
}

/**
 * Create ArrayNode
 */
async function createArrayNode(
  schema: JSONSchemaProperty,
  rootSchema: JSONSchema,
  visited: Set<string>,
  sourcePath: string,
  context?: ExternalRefContext,
): Promise<ArrayNode> {
  const items = schema.items
    ? await normalizeNode(
        schema.items,
        rootSchema,
        visited,
        `${sourcePath}/items`,
        context,
      )
    : createPrimitiveNode("string", {}, `${sourcePath}/items`);

  const constraints: Constraint[] = [];
  if (schema.minItems !== undefined) {
    constraints.push({ type: "minItems", value: schema.minItems });
  }
  if (schema.maxItems !== undefined) {
    constraints.push({ type: "maxItems", value: schema.maxItems });
  }
  if (schema.uniqueItems !== undefined) {
    constraints.push({ type: "uniqueItems", value: schema.uniqueItems });
  }

  return {
    kind: "array",
    items,
    constraints: constraints.length > 0 ? constraints : undefined,
    description: schema.description,
    sourcePath,
  };
}

/**
 * Create PrimitiveNode
 */
function createPrimitiveNode(
  type: "string" | "number" | "integer" | "boolean" | "null",
  schema: JSONSchemaProperty,
  sourcePath: string,
): PrimitiveNode {
  const constraints: Constraint[] = [];

  if (schema.minimum !== undefined) {
    constraints.push({ type: "minimum", value: schema.minimum });
  }
  if (schema.maximum !== undefined) {
    constraints.push({ type: "maximum", value: schema.maximum });
  }
  if (schema.minLength !== undefined) {
    constraints.push({ type: "minLength", value: schema.minLength });
  }
  if (schema.maxLength !== undefined) {
    constraints.push({ type: "maxLength", value: schema.maxLength });
  }
  if (schema.pattern !== undefined) {
    constraints.push({ type: "pattern", value: schema.pattern });
  }
  if (schema.format !== undefined) {
    constraints.push({ type: "format", value: schema.format });
  }

  return {
    kind: "primitive",
    type,
    enum: schema.enum,
    const: schema.const,
    default: schema.default,
    constraints: constraints.length > 0 ? constraints : undefined,
    description: schema.description,
    sourcePath,
  };
}
