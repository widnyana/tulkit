export interface EncodeOptions {
  singleLine: boolean;
  lineWidth: number;
  urlSafe: boolean;
}

// btoa only handles latin1; convert bytes to a binary string first, in chunks
// to avoid String.fromCharCode stack overflow on large inputs.
function bytesToBinary(bytes: Uint8Array): string {
  let s = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return s;
}

function wrapLines(s: string, width: number): string {
  if (width < 1) return s;
  const rows: string[] = [];
  for (let i = 0; i < s.length; i += width) rows.push(s.slice(i, i + width));
  return rows.join("\n");
}

// Core primitive: raw bytes -> Base64 text, with optional url-safe alphabet and wrapping.
export function bytesToBase64(bytes: Uint8Array, opts: EncodeOptions): string {
  let b64 = btoa(bytesToBinary(bytes));
  if (opts.urlSafe) {
    b64 = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  return opts.singleLine ? b64 : wrapLines(b64, opts.lineWidth);
}

// Core primitive: Base64 text -> raw bytes. Tolerates whitespace, url-safe
// alphabet, and missing padding, so it accepts standard and base64url input.
export function base64ToBytes(input: string): Uint8Array {
  let b64 = input.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad) b64 += "=".repeat(4 - pad);
  const binary = atob(b64); // throws on invalid input
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export function encodeBase64(text: string, opts: EncodeOptions): string {
  return bytesToBase64(new TextEncoder().encode(text), opts);
}

export function decodeBase64(input: string): string {
  return new TextDecoder().decode(base64ToBytes(input));
}

const RAW: EncodeOptions = { singleLine: true, lineWidth: 0, urlSafe: false };

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, "").replace(/^0x/i, "");
  if (clean.length % 2 !== 0)
    throw new Error("Hex must have an even number of digits");
  if (!/^[0-9a-fA-F]*$/.test(clean))
    throw new Error("Hex contains non-hex characters");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

export function hexToBase64(hex: string): string {
  return bytesToBase64(hexToBytes(hex), RAW);
}

export function base64ToHex(b64: string): string {
  return bytesToHex(base64ToBytes(b64));
}
