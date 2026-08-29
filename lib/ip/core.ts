/**
 * Family-generic IPv4/IPv6 subnet math, shared by /ipcalc and /ip-planner.
 *
 * Internal representation: a 32-bit or 128-bit BigInt plus an address-family
 * tag. All addresses parse at the boundary (parseIpAddress/parseCidr) and
 * format on the way out; everything downstream is trusted bigint arithmetic.
 * Family-specific parsing/formatting/classification lives in ./ipv4.ts and
 * ./ipv6.ts; this module dispatches and holds the operations.
 *
 * ponytail: VLSM/suggestMask host counts are Number-safe integers (<= 2^53-1).
 * Planning allocations larger than that is prefix math, not host counting.
 */

import type {
  BasicCalcResult,
  BoundaryCheckResult,
  CollisionCheck,
  DeaggregationResult,
  IpAddress,
  IpFamily,
  SubnetInfo,
  SubnetResult,
  SupernetResult,
  VLSMResult,
} from "./types.ts";
import {
  classifyV4Class,
  classifyV4Type,
  dottedMaskToCidr,
  formatV4,
  parseV4Value,
} from "./ipv4.ts";
import { classifyV6, formatMaskV6, formatV6, parseV6Value } from "./ipv6.ts";

export * from "./types.ts";

const FAMILY_BITS: Record<IpFamily, number> = { ipv4: 32, ipv6: 128 };
const FAMILY_MAX: Record<IpFamily, bigint> = {
  ipv4: (1n << 32n) - 1n,
  ipv6: (1n << 128n) - 1n,
};

/** Host counts are Number-safe integers; larger allocations are prefix math. */
export const MAX_SAFE_HOST_COUNT = Number.MAX_SAFE_INTEGER;

/** Subnet generation shows at most this many rows (IPv6 counts explode fast). */
export const MAX_SUBNET_ROWS = 1000;

function bitLength(n: bigint): number {
  return n.toString(2).length;
}

/** Smallest b with 2^b >= n, for n >= 1. */
function ceilLog2(n: bigint): number {
  return n <= 1n ? 0 : bitLength(n - 1n);
}

/** Prefix → mask as bigint. Trusts prefix within family range. */
function maskInto(prefix: number, family: IpFamily): bigint {
  return ((1n << BigInt(prefix)) - 1n) << BigInt(FAMILY_BITS[family] - prefix);
}

/** Count of usable hosts; number for v4, decimal string for v6. */
function usableHosts(prefix: number, family: IpFamily): number | string {
  if (prefix >= FAMILY_BITS[family] - 1) {
    return family === "ipv6"
      ? String(1n << BigInt(FAMILY_BITS[family] - prefix))
      : 1 << (FAMILY_BITS[family] - prefix);
  }
  const n = (1n << BigInt(FAMILY_BITS[family] - prefix)) - 2n;
  return family === "ipv4" ? Number(n) : n.toString();
}

/** Format a host count for display/serialization: number for v4, decimal string for v6. */
export function formatHosts(n: number | string): string {
  return typeof n === "string" ? n : n.toLocaleString();
}

// ---------------------------------------------------------------------------
// Parsing (the only untrusted→trusted crossing in this module)
// ---------------------------------------------------------------------------

/**
 * Parse an IPv4 (dotted-quad) or IPv6 (RFC 4291, RFC 5952-compatible input)
 * address. Returns null for anything that is not a valid address.
 */
export function parseIpAddress(text: string): IpAddress | null {
  const s = text.trim();
  if (s.includes(":")) {
    const value = parseV6Value(s);
    return value === null ? null : { family: "ipv6", value };
  }
  if (s.includes(".")) {
    const value = parseV4Value(s);
    return value === null ? null : { family: "ipv4", value };
  }
  return null;
}

export function parseCidr(
  text: string,
): { family: IpFamily; addr: bigint; prefix: number } | null {
  const s = text.trim();
  const slash = s.lastIndexOf("/");
  if (slash === -1) return null;
  const addr = parseIpAddress(s.slice(0, slash));
  if (!addr) return null;
  const tail = s.slice(slash + 1);
  if (!/^\d+$/.test(tail)) return null;
  const prefix = Number(tail);
  if (prefix < 0 || prefix > FAMILY_BITS[addr.family]) return null;
  return { family: addr.family, addr: addr.value, prefix };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatIpAddress(addr: IpAddress): string {
  return addr.family === "ipv4" ? formatV4(addr.value) : formatV6(addr.value);
}

function formatMask(family: IpFamily, mask: bigint): string {
  if (family === "ipv4") return formatV4(mask);
  return formatMaskV6(mask); // expanded 128-bit mask
}

// ---------------------------------------------------------------------------
// Public validation shims (family-agnostic)
// ---------------------------------------------------------------------------

export function validateIPAddress(ip: string): boolean {
  return parseIpAddress(ip) !== null;
}

export function validateCIDR(cidr: string): boolean {
  return parseCidr(cidr) !== null;
}

// ---------------------------------------------------------------------------
// Operations (ip-planner)
// ---------------------------------------------------------------------------

function subnetInfoFrom(
  addr: bigint,
  prefix: number,
  family: IpFamily,
): SubnetInfo {
  const bits = FAMILY_BITS[family];
  const max = FAMILY_MAX[family];
  const mask = maskInto(prefix, family);
  const network = addr & mask;
  // v6 has no broadcast; the field carries the last address of the block.
  const broadcast = network | (~mask & max);
  // /31 (RFC 3021) and /127 (RFC 6164): network and broadcast are both usable.
  const first = prefix >= bits - 1 ? network : network + 1n;
  const last = prefix >= bits - 1 ? broadcast : broadcast - 1n;
  const fmt = (v: bigint) => formatIpAddress({ family, value: v });

  return {
    network: fmt(network),
    broadcast: fmt(broadcast),
    mask: formatMask(family, mask),
    cidr: prefix,
    usableHosts: usableHosts(prefix, family),
    firstIP: fmt(first),
    lastIP: fmt(last),
    cidrNotation: `${fmt(network)}/${prefix}`,
  };
}

export function calculateSubnetInfo(cidr: string): SubnetInfo | null {
  const parsed = parseCidr(cidr);
  if (!parsed) return null;
  return subnetInfoFrom(parsed.addr, parsed.prefix, parsed.family);
}

export function splitVLSM(
  parentBlock: string,
  requiredSizes: number[],
): VLSMResult[] | null {
  const parsed = parseCidr(parentBlock);
  if (!parsed) return null;

  const { family } = parsed;
  const bits = FAMILY_BITS[family];
  const parentNetwork = parsed.addr & maskInto(parsed.prefix, family);
  const parentSize = 1n << BigInt(bits - parsed.prefix);

  const fmt = (v: bigint) => formatIpAddress({ family, value: v });
  const sorted = [...requiredSizes].sort((a, b) => b - a);
  const results: VLSMResult[] = [];
  let cursor = parentNetwork;

  for (const requiredHosts of sorted) {
    if (
      !Number.isInteger(requiredHosts) ||
      requiredHosts < 1 ||
      requiredHosts > MAX_SAFE_HOST_COUNT
    ) {
      return null;
    }
    // +2 for network and broadcast addresses (except /31 and /32-style ends).
    const needed =
      requiredHosts > 2 ? BigInt(requiredHosts) + 2n : BigInt(requiredHosts);
    const bitsNeeded = ceilLog2(needed);
    const prefix = bits - bitsNeeded;

    if (prefix < parsed.prefix || prefix > bits) return null;

    const size = 1n << BigInt(bitsNeeded);
    if (cursor + size > parentNetwork + parentSize) return null;

    const broadcast = cursor + size - 1n;
    results.push({
      network: fmt(cursor),
      cidr: prefix,
      mask: formatMask(family, maskInto(prefix, family)),
      usableHosts: usableHosts(prefix, family),
      firstIP: fmt(prefix >= bits - 1 ? cursor : cursor + 1n),
      lastIP: fmt(prefix >= bits - 1 ? broadcast : broadcast - 1n),
      cidrNotation: `${fmt(cursor)}/${prefix}`,
    });
    cursor += size;
  }

  return results;
}

export function suggestSubnetMask(
  startIP: string,
  requiredHosts: number,
): BoundaryCheckResult | null {
  const parsed = parseIpAddress(startIP);
  if (!parsed) return null;
  if (
    !Number.isInteger(requiredHosts) ||
    requiredHosts < 1 ||
    requiredHosts > MAX_SAFE_HOST_COUNT
  ) {
    return null;
  }

  const { family, value } = parsed;
  const bits = FAMILY_BITS[family];
  const needed =
    requiredHosts > 2 ? BigInt(requiredHosts) + 2n : BigInt(requiredHosts);
  const prefix = bits - ceilLog2(needed);
  // A family cannot hold more addresses than it has bits for; reject cleanly
  // instead of computing a negative prefix (BigInt shift would throw).
  if (prefix < 0) return null;

  const mask = maskInto(prefix, family);
  const network = value & mask;
  const broadcast = network | (~mask & FAMILY_MAX[family]);
  const fmt = (v: bigint) => formatIpAddress({ family, value: v });

  const isValid = value === network;
  const warning = isValid
    ? undefined
    : `Warning: ${fmt(value)} is not a network address. Network starts at ${fmt(network)}`;

  return {
    suggestedMask: prefix,
    network: fmt(network),
    broadcast: fmt(broadcast),
    isValid,
    warning,
  };
}

export function reverseLookup(ip: string, cidr: number): SubnetInfo | null {
  const parsed = parseIpAddress(ip);
  if (!parsed) return null;
  if (
    !Number.isInteger(cidr) ||
    cidr < 0 ||
    cidr > FAMILY_BITS[parsed.family]
  ) {
    return null;
  }
  return subnetInfoFrom(parsed.value, cidr, parsed.family);
}

export function detectCollisions(
  existingSubnets: string[],
  newSubnet: string,
): CollisionCheck {
  const parsedNew = parseCidr(newSubnet);
  if (!parsedNew) {
    return {
      hasCollision: false,
      overlappingSubnets: [],
      message: "Invalid CIDR notation",
    };
  }

  const newNetwork =
    parsedNew.addr & maskInto(parsedNew.prefix, parsedNew.family);
  const newEnd =
    newNetwork |
    (~maskInto(parsedNew.prefix, parsedNew.family) &
      FAMILY_MAX[parsedNew.family]);

  const overlapping: string[] = [];
  for (const cidr of existingSubnets) {
    const parsed = parseCidr(cidr);
    if (!parsed || parsed.family !== parsedNew.family) continue; // v4 and v6 are disjoint spaces
    const start = parsed.addr & maskInto(parsed.prefix, parsed.family);
    const end =
      start |
      (~maskInto(parsed.prefix, parsed.family) & FAMILY_MAX[parsed.family]);
    if (newNetwork <= end && newEnd >= start) {
      overlapping.push(cidr.trim());
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

// ---------------------------------------------------------------------------
// Operations (ipcalc)
// ---------------------------------------------------------------------------

/**
 * Full breakdown of an address + netmask. IPv4 accepts a dotted mask or a
 * CIDR number (a leading "/" is stripped); IPv6 accepts a CIDR number only.
 */
export function calculateBasicInfo(
  address: string,
  netmask: string,
): BasicCalcResult | null {
  const parsed = parseIpAddress(address);
  if (!parsed) return null;

  const bits = FAMILY_BITS[parsed.family];
  const tail = netmask.trim().replace(/^\//, "");
  let cidr: number;
  let maskStr: string;

  if (parsed.family === "ipv4" && tail.includes(".")) {
    const fromMask = dottedMaskToCidr(tail);
    if (fromMask === null) return null;
    cidr = fromMask;
    maskStr = tail;
  } else {
    if (!/^\d+$/.test(tail)) return null;
    cidr = Number(tail);
    if (cidr < 0 || cidr > bits) return null;
    maskStr = formatMask(parsed.family, maskInto(cidr, parsed.family));
  }

  const mask = maskInto(cidr, parsed.family);
  const network = parsed.value & mask;
  const last = network | (~mask & FAMILY_MAX[parsed.family]);
  const wildcard = ~mask & FAMILY_MAX[parsed.family];
  // /31 (RFC 3021) and /127 (RFC 6164): network and broadcast are both usable.
  const hostMin = cidr >= bits - 1 ? network : network + 1n;
  const hostMax = cidr >= bits - 1 ? last : last - 1n;
  const fmt = (v: bigint) =>
    formatIpAddress({ family: parsed.family, value: v });

  return {
    family: parsed.family,
    address: fmt(parsed.value),
    netmask: maskStr,
    netmaskCIDR: cidr,
    wildcard: fmt(wildcard),
    network: fmt(network),
    broadcast: fmt(last),
    hostMin: fmt(hostMin),
    hostMax: fmt(hostMax),
    hostsNet: usableHosts(cidr, parsed.family),
    networkClass:
      parsed.family === "ipv4" ? classifyV4Class(parsed.value) : undefined,
    networkType:
      parsed.family === "ipv4"
        ? classifyV4Type(network, last, cidr)
        : classifyV6(parsed.value),
    cidrNotation: `${fmt(network)}/${cidr}`,
  };
}

/**
 * Generate the subnets produced by moving to a larger prefix. At most
 * MAX_SUBNET_ROWS rows are returned (IPv6 counts can exceed 2^50).
 */
export function calculateSubnets(
  baseNetwork: string,
  baseCIDR: number,
  newCIDR: number,
): SubnetResult[] | null {
  const parsed = parseIpAddress(baseNetwork);
  if (!parsed) return null;

  const bits = FAMILY_BITS[parsed.family];
  if (newCIDR <= baseCIDR || newCIDR > bits) return null;

  const network = parsed.value & maskInto(baseCIDR, parsed.family);
  const size = 1n << BigInt(bits - newCIDR);
  const count = 1n << BigInt(newCIDR - baseCIDR);
  const shown =
    count > BigInt(MAX_SUBNET_ROWS) ? MAX_SUBNET_ROWS : Number(count);
  const fmt = (v: bigint) =>
    formatIpAddress({ family: parsed.family, value: v });

  const results: SubnetResult[] = [];
  for (let i = 0n; i < BigInt(shown); i++) {
    const net = network + i * size;
    const last = net + size - 1n;
    const hostMin = newCIDR >= bits - 1 ? net : net + 1n;
    const hostMax = newCIDR >= bits - 1 ? last : last - 1n;

    results.push({
      family: parsed.family,
      network: fmt(net),
      cidr: newCIDR,
      mask: formatMask(parsed.family, maskInto(newCIDR, parsed.family)),
      broadcast: fmt(last),
      hostMin: fmt(hostMin),
      hostMax: fmt(hostMax),
      hostsNet: usableHosts(newCIDR, parsed.family),
      cidrNotation: `${fmt(net)}/${newCIDR}`,
    });
  }

  return results;
}

/** Calculate the supernet when moving to a smaller prefix (larger network). */
export function calculateSupernet(
  baseNetwork: string,
  baseCIDR: number,
  newCIDR: number,
): SupernetResult | null {
  const parsed = parseIpAddress(baseNetwork);
  if (!parsed) return null;

  const bits = FAMILY_BITS[parsed.family];
  if (newCIDR >= baseCIDR || newCIDR < 0 || baseCIDR > bits) return null;

  const mask = maskInto(newCIDR, parsed.family);
  const network = parsed.value & maskInto(baseCIDR, parsed.family) & mask;
  const wildcard = ~mask & FAMILY_MAX[parsed.family];
  const last = network | wildcard;
  const fmt = (v: bigint) =>
    formatIpAddress({ family: parsed.family, value: v });
  const hostMin = newCIDR >= bits - 1 ? network : network + 1n;
  const hostMax = newCIDR >= bits - 1 ? last : last - 1n;

  return {
    family: parsed.family,
    network: fmt(network),
    cidr: newCIDR,
    mask: formatMask(parsed.family, mask),
    wildcard: fmt(wildcard),
    broadcast: fmt(last),
    hostMin: fmt(hostMin),
    hostMax: fmt(hostMax),
    hostsNet: usableHosts(newCIDR, parsed.family),
    cidrNotation: `${fmt(network)}/${newCIDR}`,
  };
}

function trailingZeros(n: bigint, bits: number): number {
  if (n === 0n) return bits;
  return (n & -n).toString(2).length - 1;
}

/**
 * Deaggregate an IP range (both addresses in the same family) into the
 * optimal set of CIDR blocks. A range yields at most ~2×bits blocks, so the
 * result is always bounded; totalIPs may exceed Number.MAX_SAFE_INTEGER for
 * large IPv6 ranges and is returned as a decimal string then.
 */
export function deaggregate(
  startIP: string,
  endIP: string,
): DeaggregationResult | null {
  const a = parseIpAddress(startIP);
  const b = parseIpAddress(endIP);
  if (!a || !b || a.family !== b.family || a.value > b.value) return null;

  const bits = FAMILY_BITS[a.family];
  const fmt = (v: bigint) => formatIpAddress({ family: a.family, value: v });
  let start = a.value;
  const end = b.value;

  const cidrBlocks: string[] = [];
  let totalIPs = 0n;

  while (start <= end) {
    let step = trailingZeros(start, bits);
    while (step > 0 && (start | ((1n << BigInt(step)) - 1n)) > end) step--;

    const size = 1n << BigInt(step);
    cidrBlocks.push(`${fmt(start)}/${bits - step}`);
    totalIPs += size;
    start += size;
  }

  return {
    family: a.family,
    cidrBlocks,
    totalIPs:
      totalIPs <= BigInt(Number.MAX_SAFE_INTEGER)
        ? Number(totalIPs)
        : totalIPs.toString(),
    blockCount: cidrBlocks.length,
  };
}
