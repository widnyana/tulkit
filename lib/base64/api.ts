import {
  base64ToHex,
  encodeBase64,
  hexToBase64,
  decodeBase64,
} from "./base64.ts";
import { decodeJwt } from "./jwt.ts";

/**
 * Programmatic (agent-facing) contract for base64 operations.
 * Pure parsing + dispatch; no DOM, no network — safe to unit test directly
 * and to call from a route handler.
 */

export const BASE64_OPERATIONS = [
  "encode",
  "decode",
  "hexToBase64",
  "base64ToHex",
  "jwtDecode",
] as const;

export type Base64Operation = (typeof BASE64_OPERATIONS)[number];

export interface Base64ApiOperationOptions {
  /** Use the URL-safe alphabet (- and _, no padding). Encode only. */
  urlSafe?: boolean;
  /** Wrap encoded output every N chars; 0 = single line. Encode only. */
  lineWrap?: number;
}

export interface Base64ApiRequest {
  operation: Base64Operation;
  input: string;
  options: Required<Base64ApiOperationOptions>;
}

/** Max input length in characters accepted by the API. */
export const BASE64_INPUT_LIMIT = 100_000;

function parseOptions(value: unknown): Base64ApiOperationOptions {
  if (value === undefined) return {};
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("options must be an object");
  }
  const raw = value as Record<string, unknown>;
  const out: Base64ApiOperationOptions = {};
  for (const key of Object.keys(raw)) {
    if (key !== "urlSafe" && key !== "lineWrap") {
      throw new Error(`Unknown option "${key}"`);
    }
  }
  if (raw.urlSafe !== undefined) {
    if (typeof raw.urlSafe !== "boolean") {
      throw new Error("options.urlSafe must be a boolean");
    }
    out.urlSafe = raw.urlSafe;
  }
  if (raw.lineWrap !== undefined) {
    if (
      typeof raw.lineWrap !== "number" ||
      !Number.isInteger(raw.lineWrap) ||
      raw.lineWrap < 0
    ) {
      throw new Error("options.lineWrap must be an integer >= 0");
    }
    out.lineWrap = raw.lineWrap;
  }
  return out;
}

export function parseBase64Request(body: unknown): Base64ApiRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error("Request body must be a JSON object");
  }
  const raw = body as Record<string, unknown>;

  if (!BASE64_OPERATIONS.includes(raw.operation as Base64Operation)) {
    throw new Error(
      `operation must be one of: ${BASE64_OPERATIONS.join(", ")}`,
    );
  }

  if (typeof raw.input !== "string") {
    throw new Error("input must be a string");
  }
  if (raw.input.length > BASE64_INPUT_LIMIT) {
    throw new Error(`input exceeds ${BASE64_INPUT_LIMIT} characters`);
  }
  return {
    operation: raw.operation as Base64Operation,
    input: raw.input,
    options: { urlSafe: false, lineWrap: 0, ...parseOptions(raw.options) },
  };
}

export async function runBase64Operation(
  req: Base64ApiRequest,
): Promise<string> {
  const { operation, input, options } = req;
  switch (operation) {
    case "encode":
      return encodeBase64(input, {
        singleLine: options.lineWrap === 0,
        lineWidth: options.lineWrap || 76,
        urlSafe: options.urlSafe,
      });
    case "decode":
      return decodeBase64(input);
    case "hexToBase64":
      return hexToBase64(input);
    case "base64ToHex":
      return base64ToHex(input);
    case "jwtDecode": {
      const decoded = decodeJwt(input);
      // decodeJwt returns header/payload as pretty-printed strings; unwrap
      // them so consumers get one structured JSON document.
      return JSON.stringify(
        {
          header: JSON.parse(decoded.header),
          payload: JSON.parse(decoded.payload),
          signature: decoded.signature,
        },
        null,
        2,
      );
    }
  }
}
