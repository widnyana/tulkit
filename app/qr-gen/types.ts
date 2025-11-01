import type { BaseShapeOptions, ShapeOptions } from "./svg-renderer";
import type { GradientType } from "./gradient-utils";

export type { BaseShapeOptions, ShapeOptions };

export interface QROptions {
  errorCorrection: "LOW" | "MEDIUM" | "QUARTILE" | "HIGH";
  moduleSize: number; // Pixels per module (4-12)
  quietZone: number; // Modules of white border (2-6)
  includeWatermark: boolean; // Whether to add watermark
}

export interface StyledQROptions {
  errorCorrection: "LOW" | "MEDIUM" | "QUARTILE" | "HIGH";
  shapeOptions?: ShapeOptions;
  gradientType?: GradientType;
  colors?: string[];
  logoImage?: string; // Data URL or image src
  logoSize?: number; // Size in pixels
  size: number; // QR code size in pixels
  includeWatermark?: boolean;
}
