/**
 * IPv4-specific parsing, formatting, and classification.
 *
 * Parsed/formatted as a 128-bit-safe BigInt value in [0, 2^32); the
 * family-generic dispatch lives in ./core.ts.
 */

/** Leading-ones mask check: octets are 0-255 and the mask must be contiguous. */
const DECIMAL_OCTET = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const V4_MAX = 0xffff_ffffn;

export function parseV4Value(s: string): bigint | null {
  const parts = s.split(".");
  if (parts.length !== 4) return null;
  let out = 0n;
  for (const part of parts) {
    if (!DECIMAL_OCTET.test(part)) return null;
    out = (out << 8n) | BigInt(part);
  }
  return out;
}

export function formatV4(value: bigint): string {
  return [
    (value >> 24n) & 0xffn,
    (value >> 16n) & 0xffn,
    (value >> 8n) & 0xffn,
    value & 0xffn,
  ].join(".");
}

/** Prefix → dotted-quad subnet mask. Trusts prefix in [0, 32]. */
export function cidrToDottedMask(cidr: number): string {
  const mask = (((1n << BigInt(cidr)) - 1n) << BigInt(32 - cidr)) & V4_MAX;
  return formatV4(mask);
}

/** Dotted-quad mask → prefix; null unless the mask is contiguous leading ones. */
export function dottedMaskToCidr(mask: string): number | null {
  const value = parseV4Value(mask);
  if (value === null) return null;
  const inverted = ~value & V4_MAX;
  if ((inverted & (inverted + 1n)) !== 0n) return null;
  return value.toString(2).replace(/0/g, "").length;
}

const v4 = (a: number, b: number, c: number, d: number): bigint =>
  (BigInt(a) << 24n) | (BigInt(b) << 16n) | (BigInt(c) << 8n) | BigInt(d);

/** Address class A-E based on the first octet. */
export function classifyV4Class(value: bigint): string {
  const first = Number(value >> 24n);
  if (first >= 1 && first <= 126) return "A";
  if (first >= 128 && first <= 191) return "B";
  if (first >= 192 && first <= 223) return "C";
  if (first >= 224 && first <= 239) return "D (Multicast)";
  if (first >= 240 && first <= 255) return "E (Reserved)";
  return "Invalid";
}

/** Identify special network types (RFC 1918, loopback, etc.) by block overlap. */
export function classifyV4Type(
  network: bigint,
  broadcast: bigint,
  cidr: number,
): string | undefined {
  const specialNetworks = [
    {
      start: v4(192, 168, 0, 0),
      end: v4(192, 168, 255, 255),
      type: "Private Internet (RFC 1918)",
    },
    {
      start: v4(172, 16, 0, 0),
      end: v4(172, 31, 255, 255),
      type: "Private Internet (RFC 1918)",
    },
    {
      start: v4(10, 0, 0, 0),
      end: v4(10, 255, 255, 255),
      type: "Private Internet (RFC 1918)",
    },
    {
      start: v4(169, 254, 0, 0),
      end: v4(169, 254, 255, 255),
      type: "APIPA (RFC 3330)",
    },
    {
      start: v4(127, 0, 0, 0),
      end: v4(127, 255, 255, 255),
      type: "Loopback (RFC 1700)",
    },
    {
      start: v4(224, 0, 0, 0),
      end: v4(239, 255, 255, 255),
      type: "Multicast (RFC 3171)",
    },
  ];

  for (const special of specialNetworks) {
    if (network <= special.end && broadcast >= special.start) {
      return special.type;
    }
  }

  if (cidr === 31) {
    return "Point-to-Point Link (RFC 3021)";
  }

  return undefined;
}
