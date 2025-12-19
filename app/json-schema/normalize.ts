/**
 * Schema normalization engine: JSON Schema → Logical AST
 *
 * Converts raw JSON Schema into an explicit AST that separates:
 * - Structure (object/array/primitive)
 * - Logic operators (allOf/anyOf/oneOf/not)
 *
 * This makes implicit semantics explicit and enables correct rendering.
 */

import type { JSONSchema, JSONSchemaProperty } from "./types";
import type {
  ASTNode,
  Constraint,
  AndNode,
  OrNode,
  XorNode,
  NotNode,
  ObjectNode,
  ArrayNode,
  PrimitiveNode,
} from "./ast-types";
import { resolveReferences } from "./utils";
import { detectDiscriminator } from "./discriminator-detection";

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
function isJSONSchema(
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
export function normalizeSchema(schema: JSONSchema): ASTNode {
  return normalizeNode(schema, schema, new Set(), "");
}

/**
 * Normalize a schema node recursively.
 *
 * @param node - Current schema node
 * @param rootSchema - Root schema (for $ref resolution)
 * @param visited - Set of visited $ref paths (circular detection)
 * @param sourcePath - Path in original schema (for debugging)
 */
function normalizeNode(
  node: JSONSchemaProperty | JSONSchema,
  rootSchema: JSONSchema,
  visited: Set<string>,
  sourcePath: string,
): ASTNode {
  // Step 1: Resolve $ref
  let resolved = node;
  if (node.$ref) {
    // Prevent infinite loops
    if (visited.has(node.$ref)) {
      resolved = {
        type: "object",
        description: "[Circular reference detected]",
      };
    } else {
      const newVisited = new Set(visited);
      newVisited.add(node.$ref);
      resolved = resolveReferences(node, rootSchema, newVisited);
    }
  }

  // Step 2: Lift logic keywords
  const logicNodes: ASTNode[] = [];

  if (resolved.allOf && Array.isArray(resolved.allOf)) {
    logicNodes.push(
      createAndNode(resolved.allOf, rootSchema, visited, sourcePath),
    );
  }

  if (resolved.anyOf && Array.isArray(resolved.anyOf)) {
    logicNodes.push(
      createOrNode(resolved.anyOf, rootSchema, visited, sourcePath),
    );
  }

  if (resolved.oneOf && Array.isArray(resolved.oneOf)) {
    logicNodes.push(
      createXorNode(resolved.oneOf, rootSchema, visited, sourcePath),
    );
  }

  if (resolved.not) {
    logicNodes.push(
      createNotNode(resolved.not, rootSchema, visited, sourcePath),
    );
  }

  // Step 3: Extract structure
  const structureNode = extractStructure(
    resolved,
    rootSchema,
    visited,
    sourcePath,
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
  return createPrimitiveNode("string", isJSONSchemaProperty(resolved) ? resolved : (resolved as JSONSchemaProperty), sourcePath);
}

/**
 * Extract structural schema (object/array/primitive)
 */
function extractStructure(
  schema: JSONSchemaProperty | JSONSchema,
  rootSchema: JSONSchema,
  visited: Set<string>,
  sourcePath: string,
): ASTNode | null {
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];

  // Object type
  if (types.includes("object") || schema.properties) {
    return createObjectNode(
      isJSONSchemaProperty(schema) ? schema : (schema as JSONSchemaProperty),
      rootSchema,
      visited,
      sourcePath,
    );
  }

  // Array type
  if (types.includes("array") || schema.items) {
    return createArrayNode(
      isJSONSchemaProperty(schema) ? schema : (schema as JSONSchemaProperty),
      rootSchema,
      visited,
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

  // Primitive types
  if (
    types.some((t) =>
      ["string", "number", "integer", "boolean", "null"].includes(t as string),
    )
  ) {
    const primitiveType = types.find((t) =>
      ["string", "number", "integer", "boolean", "null"].includes(t as string),
    ) as "string" | "number" | "integer" | "boolean" | "null";
    return createPrimitiveNode(primitiveType, isJSONSchemaProperty(schema) ? schema : (schema as JSONSchemaProperty), sourcePath);
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
function createAndNode(
  schemas: JSONSchemaProperty[],
  rootSchema: JSONSchema,
  visited: Set<string>,
  sourcePath: string,
): AndNode {
  const nodes = schemas.map((schema, index) =>
    normalizeNode(schema, rootSchema, visited, `${sourcePath}/allOf[${index}]`),
  );

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
function createOrNode(
  schemas: JSONSchemaProperty[],
  rootSchema: JSONSchema,
  visited: Set<string>,
  sourcePath: string,
): OrNode {
  const nodes = schemas.map((schema, index) =>
    normalizeNode(
      isJSONSchemaProperty(schema) ? schema : (schema as JSONSchemaProperty),
      rootSchema,
      visited,
      `${sourcePath}/anyOf[${index}]`,
    ),
  );

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
function createXorNode(
  schemas: JSONSchemaProperty[],
  rootSchema: JSONSchema,
  visited: Set<string>,
  sourcePath: string,
): XorNode {
  const nodes = schemas.map((schema, index) =>
    normalizeNode(schema, rootSchema, visited, `${sourcePath}/oneOf[${index}]`),
  );

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
function createNotNode(
  schema: JSONSchemaProperty,
  rootSchema: JSONSchema,
  visited: Set<string>,
  sourcePath: string,
): NotNode {
  return {
    kind: "not",
    node: normalizeNode(schema, rootSchema, visited, `${sourcePath}/not`),
    sourcePath,
  };
}

/**
 * Create ObjectNode
 */
function createObjectNode(
  schema: JSONSchemaProperty | JSONSchema,
  rootSchema: JSONSchema,
  visited: Set<string>,
  sourcePath: string,
): ObjectNode {
  const properties: Record<string, ASTNode> = {};

  if (schema.properties) {
    Object.entries(schema.properties).forEach(([key, prop]) => {
      properties[key] = normalizeNode(
        prop,
        rootSchema,
        visited,
        `${sourcePath}/properties/${key}`,
      );
    });
  }

  const required = new Set<string>(
    Array.isArray(schema.required) ? schema.required : [],
  );

  let additionalProperties: boolean | ASTNode | undefined;
  if (schema.additionalProperties !== undefined) {
    if (typeof schema.additionalProperties === "boolean") {
      additionalProperties = schema.additionalProperties;
    } else {
      additionalProperties = normalizeNode(
        schema.additionalProperties,
        rootSchema,
        visited,
        `${sourcePath}/additionalProperties`,
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
function createArrayNode(
  schema: JSONSchemaProperty,
  rootSchema: JSONSchema,
  visited: Set<string>,
  sourcePath: string,
): ArrayNode {
  const items = schema.items
    ? normalizeNode(schema.items, rootSchema, visited, `${sourcePath}/items`)
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
