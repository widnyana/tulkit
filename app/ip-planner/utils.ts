import type {
  BoundaryCheckResult,
  CollisionCheck,
  SubnetInfo,
  VLSMResult,
} from "./types";

/**
 * Family-generic IPv4/IPv6 subnet math.
 *
 * Internal representation: a 32-bit or 128-bit BigInt plus an address-family
 * tag. All addresses parse at the boundary (parseIpAddress/parseCidr) and
 * format on the way out; everything downstream is trusted bigint arithmetic.
 *
 * ponytail: VLSM/suggestMask host counts are Number-safe integers (<= 2^53-1).
 * Planning allocations larger than that is prefix math, not host counting.
 */

export type IpFamily = "ipv4" | "ipv6";

export interface IpAddress {
  family: IpFamily;
  value: bigint;
}

const FAMILY_BITS: Record<IpFamily, number> = { ipv4: 32, ipv6: 128 };
const FAMILY_MAX: Record<IpFamily, bigint> = {
  ipv4: (1n << 32n) - 1n,
  ipv6: (1n << 128n) - 1n,
};

const MAX_SAFE_HOST_COUNT = Number.MAX_SAFE_INTEGER;

const HEX_GROUP = /^[0-9a-fA-F]{1,4}$/;
const DECIMAL_OCTET = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

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

function parseV4Value(s: string): bigint | null {
  const parts = s.split(".");
  if (parts.length !== 4) return null;
  let out = 0n;
  for (const part of parts) {
    if (!DECIMAL_OCTET.test(part)) return null;
    out = (out << 8n) | BigInt(part);
  }
  return out;
}

function parseV6Value(input: string): bigint | null {
  if (!input || input.includes("%")) return null; // no zone IDs

  let s = input;
  // Embedded IPv4 → rewrite as two hex groups.
  if (s.includes(".")) {
    const idx = s.lastIndexOf(":");
    if (idx === -1) return null;
    const v4 = parseV4Value(s.slice(idx + 1));
    if (v4 === null) return null;
    const hi = ((v4 >> 16n) & 0xffffn).toString(16);
    const lo = (v4 & 0xffffn).toString(16);
    s = `${s.slice(0, idx + 1)}${hi}:${lo}`;
  }

  const pieces = s.split("::");
  if (pieces.length > 2) return null; // more than one "::"

  if (pieces.length === 2) {
    const left = pieces[0] ? pieces[0].split(":") : [];
    const right = pieces[1] ? pieces[1].split(":") : [];
    // "::" must cover at least one group and every explicit group must be hex.
    if (left.length + right.length > 7) return null;
    let head = 0n;
    for (const g of left) {
      if (!HEX_GROUP.test(g)) return null;
      head = (head << 16n) | BigInt(Number.parseInt(g, 16));
    }
    let tail = 0n;
    for (const g of right) {
      if (!HEX_GROUP.test(g)) return null;
      tail = (tail << 16n) | BigInt(Number.parseInt(g, 16));
    }
    // head is leftmost: shift so its lowest group sits above fill+right groups.
    return (head << (BigInt(8 - left.length) * 16n)) | tail;
  }

  const groups = s.split(":");
  if (groups.length !== 8) return null;
  let out = 0n;
  for (const g of groups) {
    if (!HEX_GROUP.test(g)) return null;
    out = (out << 16n) | BigInt(Number.parseInt(g, 16));
  }
  return out;
}

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

function formatV4(value: bigint): string {
  return [
    (value >> 24n) & 0xffn,
    (value >> 16n) & 0xffn,
    (value >> 8n) & 0xffn,
    value & 0xffn,
  ].join(".");
}

function formatV6(value: bigint): string {
  const groups: string[] = [];
  for (let i = 7; i >= 0; i--) {
    groups.push(((value >> BigInt(i * 16)) & 0xffffn).toString(16));
  }
  // RFC 5952: compress the longest (first, on ties) run of >= 2 zero groups.
  let bestStart = -1;
  let bestLen = 0;
  let curStart = -1;
  let curLen = 0;
  groups.forEach((g, i) => {
    if (g === "0") {
      if (curStart === -1) curStart = i;
      curLen++;
      if (curLen > bestLen) {
        bestLen = curLen;
        bestStart = curStart;
      }
    } else {
      curStart = -1;
      curLen = 0;
    }
  });
  if (bestLen < 2) return groups.join(":");
  const head = groups.slice(0, bestStart).join(":");
  const tail = groups.slice(bestStart + bestLen).join(":");
  return `${head}::${tail}`;
}

export function formatIpAddress(addr: IpAddress): string {
  return addr.family === "ipv4" ? formatV4(addr.value) : formatV6(addr.value);
}

function formatMask(family: IpFamily, mask: bigint): string {
  if (family === "ipv4") return formatV4(mask);
  // v6 has no dotted masks; emit the full expanded 128-bit mask.
  const groups: string[] = [];
  for (let i = 7; i >= 0; i--) {
    groups.push(
      ((mask >> BigInt(i * 16)) & 0xffffn).toString(16).padStart(4, "0"),
    );
  }
  return groups.join(":");
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
// Operations
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
