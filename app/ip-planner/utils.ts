import type {
  BoundaryCheckResult,
  CollisionCheck,
  ExistingSubnet,
  SubnetInfo,
  VLSMResult,
} from "./types";

/**
 * Convert IP address string to 32-bit integer
 */
export function ipToInt(ip: string): number {
  const parts = ip.split(".").map(Number);
  return (
    ((parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0
  );
}

/**
 * Convert 32-bit integer to IP address string
 */
export function intToIp(int: number): string {
  return [
    (int >>> 24) & 0xff,
    (int >>> 16) & 0xff,
    (int >>> 8) & 0xff,
    int & 0xff,
  ].join(".");
}

/**
 * Convert CIDR prefix to subnet mask
 */
export function cidrToMask(cidr: number): string {
  const mask = ~((1 << (32 - cidr)) - 1);
  return intToIp(mask >>> 0);
}

/**
 * Calculate number of usable hosts for a given CIDR
 */
export function calculateUsableHosts(cidr: number): number {
  if (cidr === 32) return 1;
  if (cidr === 31) return 2;
  return 2 ** (32 - cidr) - 2;
}

/**
 * Validate IP address format
 */
export function validateIPAddress(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    const num = Number(part);
    return !Number.isNaN(num) && num >= 0 && num <= 255;
  });
}

/**
 * Validate CIDR notation
 */
export function validateCIDR(cidr: string): boolean {
  const parts = cidr.split("/");
  if (parts.length !== 2) return false;

  const ip = parts[0];
  const prefix = Number(parts[1]);

  return (
    validateIPAddress(ip) &&
    !Number.isNaN(prefix) &&
    prefix >= 0 &&
    prefix <= 32
  );
}

/**
 * Calculate complete subnet information from CIDR notation
 */
export function calculateSubnetInfo(cidr: string): SubnetInfo | null {
  if (!validateCIDR(cidr)) return null;

  const [ip, prefixStr] = cidr.split("/");
  const prefix = Number(prefixStr);

  const ipInt = ipToInt(ip);
  const maskInt = ~((1 << (32 - prefix)) - 1) >>> 0;
  const networkInt = (ipInt & maskInt) >>> 0;
  const broadcastInt = (networkInt | ~maskInt) >>> 0;

  const usableHosts = calculateUsableHosts(prefix);
  const firstIPInt = prefix === 32 ? networkInt : networkInt + 1;
  const lastIPInt = prefix === 32 ? networkInt : broadcastInt - 1;

  return {
    network: intToIp(networkInt),
    broadcast: intToIp(broadcastInt),
    mask: cidrToMask(prefix),
    cidr: prefix,
    usableHosts,
    firstIP: intToIp(firstIPInt),
    lastIP: intToIp(lastIPInt),
    cidrNotation: `${intToIp(networkInt)}/${prefix}`,
  };
}

/**
 * Split a parent block into subnets based on required sizes (VLSM)
 */
export function splitVLSM(
  parentBlock: string,
  requiredSizes: number[],
): VLSMResult[] | null {
  if (!validateCIDR(parentBlock)) return null;

  const [parentIP, parentPrefixStr] = parentBlock.split("/");
  const parentPrefix = Number(parentPrefixStr);
  const parentNetworkInt =
    ipToInt(parentIP) & (~((1 << (32 - parentPrefix)) - 1) >>> 0);
  const parentSize = 2 ** (32 - parentPrefix);

  // Sort sizes descending (largest first for optimal allocation)
  const sortedSizes = [...requiredSizes].sort((a, b) => b - a);

  const results: VLSMResult[] = [];
  let currentPosition = parentNetworkInt;

  for (const requiredHosts of sortedSizes) {
    // Calculate required CIDR prefix
    // Add 2 for network and broadcast addresses (except /31 and /32)
    let hostsNeeded = requiredHosts;
    if (requiredHosts > 2) {
      hostsNeeded = requiredHosts + 2;
    }

    const cidr = 32 - Math.ceil(Math.log2(hostsNeeded));

    if (cidr < parentPrefix || cidr > 32) {
      return null; // Invalid size
    }

    const subnetSize = 2 ** (32 - cidr);

    // Check if we exceed parent block
    if (currentPosition + subnetSize > parentNetworkInt + parentSize) {
      return null; // Not enough space
    }

    const networkInt = currentPosition;
    const broadcastInt = (networkInt + subnetSize - 1) >>> 0;
    const usableHosts = calculateUsableHosts(cidr);
    const firstIPInt = cidr === 32 ? networkInt : networkInt + 1;
    const lastIPInt = cidr === 32 ? networkInt : broadcastInt - 1;

    results.push({
      network: intToIp(networkInt),
      cidr,
      mask: cidrToMask(cidr),
      usableHosts,
      firstIP: intToIp(firstIPInt),
      lastIP: intToIp(lastIPInt),
      cidrNotation: `${intToIp(networkInt)}/${cidr}`,
    });

    currentPosition += subnetSize;
  }

  return results;
}

/**
 * Suggest optimal subnet mask based on starting IP and required hosts
 */
export function suggestSubnetMask(
  startIP: string,
  requiredHosts: number,
): BoundaryCheckResult | null {
  if (!validateIPAddress(startIP)) return null;

  // Calculate required CIDR
  const hostsNeeded = requiredHosts > 2 ? requiredHosts + 2 : requiredHosts;
  const suggestedCIDR = 32 - Math.ceil(Math.log2(hostsNeeded));

  const startInt = ipToInt(startIP);
  const maskInt = ~((1 << (32 - suggestedCIDR)) - 1) >>> 0;
  const networkInt = (startInt & maskInt) >>> 0;
  const broadcastInt = (networkInt | ~maskInt) >>> 0;

  // Check if starting IP is the network address
  const isValid = startInt === networkInt;
  const warning = isValid
    ? undefined
    : `Warning: ${startIP} is not a network address. Network starts at ${intToIp(networkInt)}`;

  return {
    suggestedMask: suggestedCIDR,
    network: intToIp(networkInt),
    broadcast: intToIp(broadcastInt),
    isValid,
    warning,
  };
}

/**
 * Reverse lookup - find subnet details for any IP address
 */
export function reverseLookup(ip: string, cidr: number): SubnetInfo | null {
  if (!validateIPAddress(ip)) return null;
  if (cidr < 0 || cidr > 32) return null;

  const ipInt = ipToInt(ip);
  const maskInt = ~((1 << (32 - cidr)) - 1) >>> 0;
  const networkInt = (ipInt & maskInt) >>> 0;

  return calculateSubnetInfo(`${intToIp(networkInt)}/${cidr}`);
}

/**
 * Detect if a new subnet collides with existing subnets
 */
export function detectCollisions(
  existingSubnets: string[],
  newSubnet: string,
): CollisionCheck {
  if (!validateCIDR(newSubnet)) {
    return {
      hasCollision: false,
      overlappingSubnets: [],
      message: "Invalid CIDR notation",
    };
  }

  // Parse new subnet
  const newInfo = calculateSubnetInfo(newSubnet);
  if (!newInfo) {
    return {
      hasCollision: false,
      overlappingSubnets: [],
      message: "Invalid subnet",
    };
  }

  const newStart = ipToInt(newInfo.network);
  const newEnd = ipToInt(newInfo.broadcast);

  // Parse existing subnets
  const existing: ExistingSubnet[] = [];
  for (const cidr of existingSubnets) {
    if (!validateCIDR(cidr)) continue;

    const info = calculateSubnetInfo(cidr);
    if (!info) continue;

    existing.push({
      cidr,
      startInt: ipToInt(info.network),
      endInt: ipToInt(info.broadcast),
    });
  }

  // Check for collisions
  const overlapping: string[] = [];
  for (const subnet of existing) {
    // Check if ranges overlap
    const hasOverlap = newStart <= subnet.endInt && newEnd >= subnet.startInt;

    if (hasOverlap) {
      overlapping.push(subnet.cidr);
    }
  }

  return {
    hasCollision: overlapping.length > 0,
    overlappingSubnets: overlapping,
    message:
      overlapping.length > 0
        ? `Collision detected with ${overlapping.length} subnet(s)`
        : "No collision detected - subnet is safe to use",
  };
}
