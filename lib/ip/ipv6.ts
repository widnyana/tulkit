/**
 * IPv6-specific parsing (RFC 4291), formatting (RFC 5952), and classification.
 *
 * Parsed/formatted as a BigInt value in [0, 2^128); the family-generic
 * dispatch lives in ./core.ts.
 */

import { parseV4Value } from "./ipv4.ts";

const HEX_GROUP = /^[0-9a-fA-F]{1,4}$/;

export function parseV6Value(input: string): bigint | null {
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

export function formatV6(value: bigint): string {
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

/** IPv6 has no dotted masks; emit the full expanded 128-bit mask. */
export function formatMaskV6(mask: bigint): string {
  const groups: string[] = [];
  for (let i = 7; i >= 0; i--) {
    groups.push(
      ((mask >> BigInt(i * 16)) & 0xffffn).toString(16).padStart(4, "0"),
    );
  }
  return groups.join(":");
}

/** Named well-known range containing the address, if any. */
export function classifyV6(value: bigint): string | undefined {
  if (value === 0n) return "Unspecified (::/128, RFC 4291)";
  if (value === 1n) return "Loopback (::1/128, RFC 4291)";
  if (value >> 96n === 0xffffn) return "IPv4-mapped (::ffff:0:0/96, RFC 4291)";
  if (value >> 120n === 0xffn) return "Multicast (ff00::/8, RFC 4291)";
  if (value >> 118n === 0x3fan)
    return "Link-local unicast (fe80::/10, RFC 4291)";
  if (value >> 121n === 0x7en) return "Unique local (fc00::/7, RFC 4193)";
  if (value >> 96n === 0x2001_0db8n)
    return "Documentation (2001:db8::/32, RFC 3849)";
  return undefined;
}
