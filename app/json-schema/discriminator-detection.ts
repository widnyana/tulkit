/**
 * Automatic discriminator detection for oneOf/anyOf branches.
 *
 * A discriminator is a property path whose value uniquely selects a schema branch.
 * Detection is CONSERVATIVE - fails loudly when ambiguous rather than guessing.
 *
 * Requirements for valid discriminator:
 * 1. Same property path constrained in ALL branches
 * 2. Non-overlapping constants or enums (pairwise disjoint)
 * 3. Complete coverage (every branch has exactly one value set)
 */

import type { JSONSchemaProperty } from "./types";
import type { Discriminator } from "./ast-types";

/**
 * Constraint extracted from a schema branch
 */
interface PropertyConstraint {
  path: string[];
  operator: "const" | "enum";
  values: Set<unknown>;
}

/**
 * Detect discriminator in oneOf/anyOf branches.
 * Returns null if no reliable discriminator found.
 *
 * @param branches - Schema branches to analyze
 * @returns Discriminator or null
 */
export function detectDiscriminator(
  branches: JSONSchemaProperty[],
): Discriminator | null {
  if (branches.length < 2) {
    return null; // Need at least 2 branches
  }

  // Step 1: Extract constraints from each branch
  const branchConstraints = branches.map((branch) =>
    extractConstraints(branch),
  );

  // Step 2: Find candidate paths (present in ALL branches)
  const candidatePaths = findCandidatePaths(branchConstraints);

  // Step 3: Validate each candidate for exclusivity
  for (const path of candidatePaths) {
    const discriminator = validateCandidate(path, branchConstraints, branches);
    if (discriminator) {
      return discriminator;
    }
  }

  return null; // No valid discriminator found
}

/**
 * Extract property constraints from a schema branch.
 * Only extracts const/enum constraints, ignores pattern/minimum/etc.
 */
function extractConstraints(
  schema: JSONSchemaProperty,
  basePath: string[] = [],
): PropertyConstraint[] {
  const constraints: PropertyConstraint[] = [];

  // Direct const/enum on this schema
  if (schema.const !== undefined) {
    constraints.push({
      path: basePath,
      operator: "const",
      values: new Set([schema.const]),
    });
  }

  if (schema.enum !== undefined && Array.isArray(schema.enum)) {
    constraints.push({
      path: basePath,
      operator: "enum",
      values: new Set(schema.enum),
    });
  }

  // Recurse into properties
  if (schema.properties && typeof schema.properties === "object") {
    Object.entries(schema.properties).forEach(([key, prop]) => {
      const nestedPath = [...basePath, key];
      const nestedConstraints = extractConstraints(prop, nestedPath);
      constraints.push(...nestedConstraints);
    });
  }

  // Recurse into allOf (might contain const/enum)
  if (Array.isArray(schema.allOf)) {
    schema.allOf.forEach((subSchema) => {
      const nestedConstraints = extractConstraints(subSchema, basePath);
      constraints.push(...nestedConstraints);
    });
  }

  return constraints;
}

/**
 * Find paths that appear in ALL branches
 */
function findCandidatePaths(
  branchConstraints: PropertyConstraint[][],
): string[][] {
  if (branchConstraints.length === 0) return [];

  // Get all paths from first branch
  const firstBranchPaths = new Set(
    branchConstraints[0].map((c) => JSON.stringify(c.path)),
  );

  // Filter to paths present in ALL branches
  const candidatePathStrings = Array.from(firstBranchPaths).filter(
    (pathStr) =>
      branchConstraints.every((constraints) =>
        constraints.some((c) => JSON.stringify(c.path) === pathStr),
      ),
  );

  return candidatePathStrings.map((str) => JSON.parse(str) as string[]);
}

/**
 * Validate a candidate path as a discriminator.
 * Checks that value sets are pairwise disjoint.
 */
function validateCandidate(
  path: string[],
  branchConstraints: PropertyConstraint[][],
  branches: JSONSchemaProperty[],
): Discriminator | null {
  const pathStr = JSON.stringify(path);

  // Collect value sets per branch
  const branchValueSets: Set<unknown>[] = branchConstraints.map(
    (constraints) => {
      const constraint = constraints.find(
        (c) => JSON.stringify(c.path) === pathStr,
      );
      return constraint?.values || new Set<unknown>();
    },
  );

  // Check all value sets are non-empty
  if (branchValueSets.some((set) => set.size === 0)) {
    return null; // Missing constraint in some branch
  }

  // Check pairwise disjoint (no overlapping values)
  for (let i = 0; i < branchValueSets.length; i++) {
    for (let j = i + 1; j < branchValueSets.length; j++) {
      const intersection = setIntersection(branchValueSets[i], branchValueSets[j]);
      if (intersection.size > 0) {
        return null; // Overlapping values - ambiguous
      }
    }
  }

  // Build value → branch mapping
  const mapping: Record<string, number> = {};
  branchValueSets.forEach((valueSet, branchIndex) => {
    valueSet.forEach((value) => {
      const key = String(value);
      mapping[key] = branchIndex;
    });
  });

  return {
    path,
    mapping,
  };
}

/**
 * Set intersection helper
 */
function setIntersection<T>(setA: Set<T>, setB: Set<T>): Set<T> {
  const intersection = new Set<T>();
  setA.forEach((value) => {
    if (setB.has(value)) {
      intersection.add(value);
    }
  });
  return intersection;
}

/**
 * Get human-readable path string for display
 */
export function formatDiscriminatorPath(path: string[]): string {
  return path.join(".");
}
