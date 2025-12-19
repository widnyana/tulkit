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
  metadata: SchemaMetadata;
  ast: import("./ast-types").ASTNode;
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
