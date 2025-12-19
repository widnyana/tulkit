import { normalizeSchema } from "./normalize";
import type {
	JSONSchema,
	JSONSchemaProperty,
	ParsedSchema,
	PropertyConstraints,
	SchemaMetadata,
	SchemaNode,
} from "./types";

export function parseJSONSchema(input: string): ParsedSchema {
	const errors: string[] = [];
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
			metadata: getEmptyMetadata(),
			ast: { kind: "primitive", type: "string", sourcePath: "root" },
		};
	}

	// Validate it looks like a JSON Schema
	if (!isValidSchema(schema)) {
		errors.push("Input does not appear to be a valid JSON Schema");
	}

	const metadata = analyzeSchema(schema);
	const ast = normalizeSchema(schema);

	return { schema, errors, metadata, ast };
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

function isValidSchema(schema: any): boolean {
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
			const schemas = (node as any)[key];
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
		const defs = (schema as any)[key];
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
		const schemas = (node as any)[combiner];
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

	const node: SchemaNode = {
		name,
		path,
		type: resolvedProp.type || "unknown",
		required: false, // Will be determined by parent
		description: resolvedProp.description,
		enum: resolvedProp.enum,
		defaultValue: resolvedProp.default,
		constraints: getConstraints(resolvedProp),
	};

	// Build children recursively with resolved schema
	node.children = buildChildren(resolvedProp, path, rootSchema);

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

export function resolveReferences(
	schema: JSONSchema | JSONSchemaProperty,
	rootSchema: JSONSchema,
	visited: Set<string> = new Set(),
): JSONSchema | JSONSchemaProperty {
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

		try {
			const resolved = resolveJsonPointer(ref, rootSchema);
			if (resolved) {
				return resolveReferences(resolved, rootSchema, newVisited);
			}
		} catch (error) {
			console.warn(`Failed to resolve $ref ${ref}:`, error);
			return {
				type: "object",
				description: `[Failed to resolve $ref: ${ref}]`,
			};
		}
	}

	// Handle combined schemas
	const resolvedSchema = { ...schema };

	// Recursively resolve references in nested properties
	// Each property gets its own branch, so we pass the current visited set
	if (resolvedSchema.properties) {
		const resolvedProperties: Record<string, JSONSchemaProperty> = {};
		Object.entries(resolvedSchema.properties).forEach(([key, prop]) => {
			resolvedProperties[key] = resolveReferences(
				prop,
				rootSchema,
				visited, // Pass current visited, each property is a separate branch
			) as JSONSchemaProperty;
		});
		resolvedSchema.properties = resolvedProperties;
	}

	// Resolve references in arrays
	if (resolvedSchema.items) {
		resolvedSchema.items = resolveReferences(
			resolvedSchema.items,
			rootSchema,
			visited, // Pass current visited
		) as JSONSchemaProperty;
	}

	// Resolve references in combined schemas
	["anyOf", "allOf", "oneOf"].forEach((key) => {
		const schemas = (resolvedSchema as any)[key];
		if (Array.isArray(schemas)) {
			(resolvedSchema as any)[key] = schemas.map((s: JSONSchemaProperty) =>
				resolveReferences(s, rootSchema, visited), // Each array element is a separate branch
			);
		}
	});

	if (resolvedSchema.not) {
		resolvedSchema.not = resolveReferences(
			resolvedSchema.not,
			rootSchema,
			visited, // Pass current visited
		) as JSONSchemaProperty;
	}

	if (typeof resolvedSchema.additionalProperties === "object") {
		resolvedSchema.additionalProperties = resolveReferences(
			resolvedSchema.additionalProperties as JSONSchemaProperty,
			rootSchema,
			visited, // Pass current visited
		) as JSONSchemaProperty;
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
