/**
 * AST (Abstract Syntax Tree) types for normalized JSON Schema representation.
 *
 * This AST makes implicit JSON Schema semantics explicit:
 * - allOf → AndNode (all schemas must match)
 * - anyOf → OrNode (any schema can match)
 * - oneOf → XorNode (exactly one schema must match)
 * - not → NotNode (schema must NOT match)
 *
 * Structure (object/array/primitive) is separated from logic operators.
 */

/**
 * Discriminator for oneOf/anyOf branches.
 * Only present when all branches constrain the same property path
 * with non-overlapping constants or enums.
 */
export interface Discriminator {
  /** Property path used for discrimination (e.g., ["type"] or ["meta", "kind"]) */
  path: string[];
  /** Maps discriminator value to branch index */
  mapping: Record<string, number>;
}

/**
 * Constraint on primitive values
 */
export interface Constraint {
  type: "minimum" | "maximum" | "minLength" | "maxLength" | "pattern" | "format" | "minItems" | "maxItems" | "uniqueItems";
  value: unknown;
}

/**
 * Base interface for all AST nodes
 */
interface BaseNode {
  /** Source path in original schema (for debugging) */
  sourcePath?: string;
  /** Description from schema */
  description?: string;
}

/**
 * Logical AND - all child schemas must match
 * Source: allOf, or implicit composition of structure + logic
 */
export interface AndNode extends BaseNode {
  kind: "and";
  nodes: ASTNode[];
}

/**
 * Logical OR - any child schema can match
 * Source: anyOf
 */
export interface OrNode extends BaseNode {
  kind: "or";
  nodes: ASTNode[];
}

/**
 * Logical XOR - exactly one child schema must match
 * Source: oneOf
 */
export interface XorNode extends BaseNode {
  kind: "xor";
  nodes: ASTNode[];
  /** Discriminator if detected, null if ambiguous */
  discriminator: Discriminator | null;
}

/**
 * Logical NOT - schema must NOT match
 * Source: not
 */
export interface NotNode extends BaseNode {
  kind: "not";
  node: ASTNode;
}

/**
 * Object type with properties
 * Source: type: "object" + properties
 */
export interface ObjectNode extends BaseNode {
  kind: "object";
  properties: Record<string, ASTNode>;
  required: Set<string>;
  /** Additional properties constraint (true/false or schema) */
  additionalProperties?: boolean | ASTNode;
}

/**
 * Array type with item schema
 * Source: type: "array" + items
 */
export interface ArrayNode extends BaseNode {
  kind: "array";
  items: ASTNode;
  constraints?: Constraint[];
}

/**
 * Primitive type (string, number, boolean, null)
 * Source: type: "string" | "number" | "boolean" | "null"
 */
export interface PrimitiveNode extends BaseNode {
  kind: "primitive";
  type: "string" | "number" | "boolean" | "null" | "integer";
  /** Allowed values (from enum) */
  enum?: unknown[];
  /** Constant value (from const) */
  const?: unknown;
  /** Default value */
  default?: unknown;
  /** Validation constraints */
  constraints?: Constraint[];
}

/**
 * Discriminated union of all AST node types
 */
export type ASTNode =
  | AndNode
  | OrNode
  | XorNode
  | NotNode
  | ObjectNode
  | ArrayNode
  | PrimitiveNode;

/**
 * Validation result for an AST node
 * (For future validation overlay feature)
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * AST node augmented with validation state
 * (For future validation overlay feature)
 */
export interface ValidatedNode<T extends ASTNode = ASTNode> {
  node: T;
  validation?: ValidationResult;
}
