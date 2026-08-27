/**
 * Pure request parsing/validation for the QR API. No QR encoding here —
 * kept free of lib/qrcodegen so node:test type-stripping can load it
 * (that vendored file uses TS namespaces, unsupported by strip-types).
 */

export const QR_ECC_LEVELS = ["LOW", "MEDIUM", "QUARTILE", "HIGH"] as const;
export type QrEccLevel = (typeof QR_ECC_LEVELS)[number];

export const QR_SHAPES = [
  "square",
  "circle",
  "rounded",
  "diamond",
  "triangle",
  "star",
] as const;
export type QrShape = (typeof QR_SHAPES)[number];

export const QR_GRADIENTS = [
  "radial",
  "linear",
  "linear-vertical",
  "sweep",
  "conical",
] as const;
export type QrGradient = (typeof QR_GRADIENTS)[number];

export interface QrApiRequest {
  text: string;
  errorCorrection: QrEccLevel;
  size: number;
  shapeOptions: {
    shape: QrShape;
    eyePatternShape: QrShape;
    gap: number;
    eyePatternGap: number;
  };
  /** Quiet-zone border in modules. */
  margin: number;
  gradient?: QrGradient;
  colors: string[];
  logoImage?: string;
  logoSize?: number;
  watermark: boolean;
}

const MIN_SIZE = 64;
const MAX_SIZE = 2048;
const MAX_TEXT = 2000;

function intInRange(
  value: unknown,
  field: string,
  min: number,
  max: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new Error(`${field} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function enumValue<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
): T | undefined {
  if (value === undefined) return undefined;
  if (!allowed.includes(value as T)) {
    throw new Error(`${field} must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function parseQrRequest(body: unknown): QrApiRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error("Request body must be a JSON object");
  }
  const raw = body as Record<string, unknown>;
  for (const key of Object.keys(raw)) {
    if (
      ![
        "text",
        "errorCorrection",
        "size",
        "shape",
        "eyePatternShape",
        "gap",
        "eyePatternGap",
        "margin",
        "gradient",
        "colors",
        "logoImage",
        "logoSize",
        "watermark",
      ].includes(key)
    ) {
      throw new Error(`Unknown option "${key}"`);
    }
  }

  if (typeof raw.text !== "string") {
    throw new Error("text must be a string");
  }
  if (raw.text.length === 0) {
    throw new Error("text must not be empty");
  }
  if (raw.text.length > MAX_TEXT) {
    throw new Error(`text exceeds ${MAX_TEXT} characters`);
  }
  // library enforces per-version capacity; let it throw at encode time

  const size =
    raw.size !== undefined
      ? intInRange(raw.size, "size", MIN_SIZE, MAX_SIZE)
      : 512;
  const ecc =
    enumValue(raw.errorCorrection, "errorCorrection", QR_ECC_LEVELS) ??
    "MEDIUM";

  const shape =
    enumValue(raw.shape, "shape", QR_SHAPES) ?? ("square" as QrShape);
  const eyePatternShape =
    enumValue(raw.eyePatternShape, "eyePatternShape", QR_SHAPES) ??
    ("square" as QrShape);
  const gap = raw.gap !== undefined ? intInRange(raw.gap, "gap", 0, 4) : 0;
  const eyePatternGap =
    raw.eyePatternGap !== undefined
      ? intInRange(raw.eyePatternGap, "eyePatternGap", 0, 4)
      : 0;
  const margin =
    raw.margin !== undefined ? intInRange(raw.margin, "margin", 0, 10) : 4;

  const gradient = enumValue(raw.gradient, "gradient", QR_GRADIENTS);

  let colors: string[] = [];
  if (raw.colors !== undefined) {
    if (
      !Array.isArray(raw.colors) ||
      raw.colors.length < 1 ||
      raw.colors.length > 6 ||
      !raw.colors.every((c) => typeof c === "string" && HEX_COLOR.test(c))
    ) {
      throw new Error(
        "colors must be an array of 1-6 hex colors (#rgb or #rrggbb)",
      );
    }
    colors = raw.colors;
  }
  if (gradient !== undefined && colors.length < 2) {
    throw new Error("gradient requires at least 2 colors");
  }

  let logoImage: string | undefined;
  if (raw.logoImage !== undefined) {
    if (
      typeof raw.logoImage !== "string" ||
      raw.logoImage.length > 100_000 ||
      !(
        raw.logoImage.startsWith("data:image/") ||
        raw.logoImage.startsWith("https://")
      )
    ) {
      throw new Error(
        "logoImage must be a data:image/... URL or https:// URL under 100000 characters",
      );
    }
    logoImage = raw.logoImage;
  }

  let logoSize: number | undefined;
  if (raw.logoSize !== undefined) {
    logoSize = intInRange(raw.logoSize, "logoSize", 16, Math.floor(size / 2));
  }
  if (logoImage !== undefined && logoSize === undefined) {
    throw new Error("logoImage requires logoSize");
  }

  if (raw.watermark !== undefined && typeof raw.watermark !== "boolean") {
    throw new Error("watermark must be a boolean");
  }

  return {
    text: raw.text,
    errorCorrection: ecc,
    size,
    shapeOptions: { shape, eyePatternShape, gap, eyePatternGap },
    margin,
    ...(gradient !== undefined ? { gradient } : {}),
    colors: colors.length > 0 ? colors : ["#000000"],
    ...(logoImage !== undefined ? { logoImage } : {}),
    ...(logoSize !== undefined ? { logoSize } : {}),
    watermark: raw.watermark ?? false,
  };
}
