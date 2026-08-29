/**
 * Shared address-family types for IPv4/IPv6 subnet math.
 *
 * Internal representation: a 32-bit or 128-bit BigInt plus an address-family
 * tag. Addresses parse at the boundary (parseIpAddress/parseCidr) and format
 * on the way out; everything downstream is trusted bigint arithmetic.
 */

export type IpFamily = "ipv4" | "ipv6";

export interface IpAddress {
  family: IpFamily;
  value: bigint;
}

export interface ParsedCidr {
  family: IpFamily;
  addr: bigint;
  prefix: number;
}

// ---------------------------------------------------------------------------
// ip-planner results
// ---------------------------------------------------------------------------

export interface SubnetInfo {
  network: string;
  broadcast: string;
  mask: string;
  cidr: number;
  usableHosts: number | string;
  firstIP: string;
  lastIP: string;
  cidrNotation: string;
}

export interface VLSMResult {
  network: string;
  cidr: number;
  mask: string;
  usableHosts: number | string;
  firstIP: string;
  lastIP: string;
  cidrNotation: string;
}

export interface CollisionCheck {
  hasCollision: boolean;
  overlappingSubnets: string[];
  message: string;
}

export interface BoundaryCheckResult {
  suggestedMask: number;
  network: string;
  broadcast: string;
  isValid: boolean;
  warning?: string;
}

// ---------------------------------------------------------------------------
// ipcalc results
// ---------------------------------------------------------------------------

export interface BasicCalcResult {
  family: IpFamily;
  address: string;
  netmask: string;
  netmaskCIDR: number;
  wildcard: string;
  network: string;
  /** Last address of the block; IPv6 has no broadcast. */
  broadcast: string;
  hostMin: string;
  hostMax: string;
  /** number for IPv4, decimal string for IPv6 (may exceed 2^53). */
  hostsNet: number | string;
  /** IPv4 class A-E; undefined for IPv6. */
  networkClass?: string;
  /** RFC 1918/3330/… type for IPv4; RFC 4291/4193/3849 range for IPv6. */
  networkType?: string;
  cidrNotation: string;
}

export interface SubnetResult {
  family: IpFamily;
  network: string;
  cidr: number;
  mask: string;
  broadcast: string;
  hostMin: string;
  hostMax: string;
  hostsNet: number | string;
  cidrNotation: string;
}

export interface SupernetResult {
  family: IpFamily;
  network: string;
  cidr: number;
  mask: string;
  wildcard: string;
  broadcast: string;
  hostMin: string;
  hostMax: string;
  hostsNet: number | string;
  cidrNotation: string;
}

export interface DeaggregationResult {
  family: IpFamily;
  cidrBlocks: string[];
  /** number when safe, decimal string for huge IPv6 ranges. */
  totalIPs: number | string;
  blockCount: number;
}
