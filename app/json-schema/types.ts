export interface JSONSchemaProperty {
  type?: string | string[];
  description?: string;
  enum?: unknown[];
  const?: unknown;
  default?: unknown;
  examples?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  required?: boolean;
  properties?: Record<string, JSONSchemaProperty>;
  items?: JSONSchemaProperty;
  additionalProperties?: boolean | JSONSchemaProperty;
  anyOf?: JSONSchemaProperty[];
  allOf?: JSONSchemaProperty[];
  oneOf?: JSONSchemaProperty[];
  not?: JSONSchemaProperty;
  $ref?: string;
  title?: string;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
}

export interface JSONSchema {
  $schema?: string;
  $id?: string;
  title?: string;
  description?: string;
  type?: string | string[];
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean | JSONSchemaProperty;
  definitions?: Record<string, JSONSchemaProperty>;
  $defs?: Record<string, JSONSchemaProperty>;
  anyOf?: JSONSchemaProperty[];
  allOf?: JSONSchemaProperty[];
  oneOf?: JSONSchemaProperty[];
  not?: JSONSchemaProperty;
  items?: JSONSchemaProperty;
  enum?: unknown[];
  const?: unknown;
  default?: unknown;
  examples?: unknown[];
  $ref?: string;
}

export interface ParsedSchema {
  schema: JSONSchema;
  errors: string[];
  warnings: string[]; // External ref warnings and non-critical issues
  metadata: SchemaMetadata;
  ast: import("./ast-types").ASTNode;
  externalRefs?: string[]; // List of fetched external schema URLs
  cacheHits?: number; // Number of schemas loaded from cache
  cacheMisses?: number; // Number of schemas fetched from network
}

export interface SchemaMetadata {
  totalProperties: number;
  requiredProperties: number;
  optionalProperties: number;
  nestedObjects: number;
  arrays: number;
  enums: number;
  references: number;
  depth: number;
  types: Record<string, number>;
}

export interface SchemaNode {
  name: string;
  path: string;
  type: string | string[];
  required?: boolean;
  description?: string;
  enum?: unknown[];
  defaultValue?: unknown;
  constraints?: PropertyConstraints;
  children?: SchemaNode[];
}

export interface PropertyConstraints {
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
}

export interface ExternalRefContext {
  baseUrl: string;
  cache: import("./schema-cache").SchemaCache;
  fetchedUrls: Set<string>; // Prevent duplicate fetches
  depth: number; // Current external ref depth
  maxDepth: number; // Maximum allowed depth (default: 5)
  maxFiles: number; // Maximum external files (default: 50)
  warnings: string[]; // Collect warnings during resolution
  cacheHits: number; // Track cache hits
  cacheMisses: number; // Track cache misses
  onProgress?: (current: number, total: number, url: string) => void; // Progress callback
}
