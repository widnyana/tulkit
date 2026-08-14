export interface EncodeOptions {
  singleLine: boolean;
  lineWidth: number;
}

// btoa only handles latin1; encode UTF-8 bytes to a binary string first, in
// chunks to avoid String.fromCharCode stack overflow on large inputs.
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

export function encodeBase64(text: string, opts: EncodeOptions): string {
  const b64 = btoa(bytesToBinary(new TextEncoder().encode(text)));
  return opts.singleLine ? b64 : wrapLines(b64, opts.lineWidth);
}

// Strips whitespace/newlines so wrapped input decodes. atob throws on invalid input.
export function decodeBase64(input: string): string {
  const binary = atob(input.replace(/\s+/g, ""));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}
