import {
  calculateSubnetInfo,
  detectCollisions,
  MAX_SAFE_HOST_COUNT,
  parseCidr,
  reverseLookup,
  splitVLSM,
  suggestSubnetMask,
} from "../../lib/ip/core.ts";

/**
 * Programmatic (agent-facing) contract for ip-planner operations.
 * Pure parsing + dispatch; no DOM, no network — safe to unit test directly
 * and to call from a route handler.
 */

export const IP_PLANNER_OPERATIONS = [
  "subnetInfo",
  "vlsm",
  "suggestMask",
  "reverseLookup",
  "collision",
] as const;

export type IpPlannerOperation = (typeof IP_PLANNER_OPERATIONS)[number];

export interface IpPlannerApiRequest {
  operation: IpPlannerOperation;
  cidr?: string;
  parentBlock?: string;
  requiredSizes?: number[];
  ip?: string;
  cidrNumber?: number;
  requiredHosts?: number;
  existingSubnets?: string[];
  newSubnet?: string;
}

/** Max array length accepted for requiredSizes / existingSubnets. */
export const IP_PLANNER_ARRAY_LIMIT = 1000;

function asString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string`);
  }
  return value;
}

function asStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
    throw new Error(`${field} must be an array of strings`);
  }
  if (value.length > IP_PLANNER_ARRAY_LIMIT) {
    throw new Error(`${field} exceeds ${IP_PLANNER_ARRAY_LIMIT} entries`);
  }
  return value as string[];
}

function asPositiveInt(value: unknown, field: string): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_SAFE_HOST_COUNT
  ) {
    throw new Error(
      `${field} must be an integer between 1 and ${MAX_SAFE_HOST_COUNT}`,
    );
  }
  return value;
}

export function parseIpPlannerRequest(body: unknown): IpPlannerApiRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error("Request body must be a JSON object");
  }
  const raw = body as Record<string, unknown>;

  if (!IP_PLANNER_OPERATIONS.includes(raw.operation as IpPlannerOperation)) {
    throw new Error(
      `operation must be one of: ${IP_PLANNER_OPERATIONS.join(", ")}`,
    );
  }

  const req: IpPlannerApiRequest = {
    operation: raw.operation as IpPlannerOperation,
  };

  switch (req.operation) {
    case "subnetInfo":
      req.cidr = asString(raw.cidr, "cidr");
      break;
    case "vlsm": {
      req.parentBlock = asString(raw.parentBlock, "parentBlock");
      if (
        !Array.isArray(raw.requiredSizes) ||
        raw.requiredSizes.length === 0 ||
        raw.requiredSizes.length > IP_PLANNER_ARRAY_LIMIT ||
        raw.requiredSizes.some(
          (v) =>
            typeof v !== "number" ||
            !Number.isInteger(v) ||
            v < 1 ||
            v > MAX_SAFE_HOST_COUNT,
        )
      ) {
        throw new Error(
          `requiredSizes must be a non-empty array of integers between 1 and ${MAX_SAFE_HOST_COUNT} (max ${IP_PLANNER_ARRAY_LIMIT} entries)`,
        );
      }
      req.requiredSizes = raw.requiredSizes as number[];
      break;
    }
    case "suggestMask":
      req.ip = asString(raw.ip, "ip");
      req.requiredHosts = asPositiveInt(raw.requiredHosts, "requiredHosts");
      break;
    case "reverseLookup":
      req.ip = asString(raw.ip, "ip");
      if (
        typeof raw.cidr !== "number" ||
        !Number.isInteger(raw.cidr) ||
        raw.cidr < 0 ||
        raw.cidr > 128
      ) {
        throw new Error("cidr must be an integer between 0 and 128");
      }
      req.cidrNumber = raw.cidr;
      break;
    case "collision": {
      req.existingSubnets = asStringArray(
        raw.existingSubnets,
        "existingSubnets",
      );
      req.newSubnet = asString(raw.newSubnet, "newSubnet");
      break;
    }
  }

  return req;
}

export function runIpPlannerOperation(req: IpPlannerApiRequest): unknown {
  switch (req.operation) {
    case "subnetInfo": {
      const result = calculateSubnetInfo(req.cidr as string);
      if (!result) throw new Error("Invalid CIDR notation");
      return result;
    }
    case "vlsm": {
      const result = splitVLSM(
        req.parentBlock as string,
        req.requiredSizes as number[],
      );
      if (!result) {
        throw new Error(
          "Cannot split: invalid CIDR, a required size exceeds the parent block, or the sizes do not fit",
        );
      }
      return result;
    }
    case "suggestMask": {
      const result = suggestSubnetMask(
        req.ip as string,
        req.requiredHosts as number,
      );
      if (!result) {
        throw new Error(
          "Invalid IP address, or requiredHosts exceeds the address family's capacity",
        );
      }
      return result;
    }
    case "reverseLookup": {
      const result = reverseLookup(req.ip as string, req.cidrNumber as number);
      if (!result) throw new Error("Invalid IP address or CIDR prefix");
      return result;
    }
    case "collision": {
      // v4 and v6 are disjoint address spaces; a mixed query is user error.
      const families = new Set(
        [req.newSubnet as string, ...(req.existingSubnets as string[])].map(
          (c) => parseCidr(c)?.family,
        ),
      );
      if (families.size > 1) {
        throw new Error(
          "Mixed address families: all subnets must be IPv4 or all IPv6",
        );
      }
      // detectCollisions reports invalid CIDRs in its message instead of
      // failing; return the structured result as-is (200).
      return detectCollisions(
        req.existingSubnets as string[],
        req.newSubnet as string,
      );
    }
  }
}
