/**
 * Main styled QR code SVG component
 */

"use client";

import { useMemo, useId, forwardRef } from "react";
import { qrcodegen } from "@/lib/qrcodegen";
import { transformMatrixIntoPath } from "../svg-renderer";
import type { ShapeOptions } from "../types";
import { generateGradientDef, getGradientUrl } from "../gradient-utils";
import type { GradientType } from "../gradient-utils";

interface QRCodeSVGProps {
  value: string;
  size: number;
  errorLevel: "LOW" | "MEDIUM" | "QUARTILE" | "HIGH";
  shapeOptions?: ShapeOptions;
  gradientType?: GradientType;
  colors?: string[];
  logoImage?: string;
  logoSize?: number;
  className?: string;
  includeWatermark?: boolean;
  watermarkText?: string;
}

const QRCodeSVGComponent = forwardRef<SVGSVGElement, QRCodeSVGProps>(
  (
    {
      value,
      size,
      errorLevel,
      shapeOptions,
      gradientType,
      colors = ["#000000"],
      logoImage,
      logoSize = 0,
      className,
      includeWatermark = false,
      watermarkText = "Generated using https://tulkit.widnyana.web.id",
    },
    ref,
  ) => {
    const gradientId = useId();

    const { svgPath } = useMemo(() => {
      // Map error level to qrcodegen.QrCode.Ecc
      const eccMap = {
        LOW: qrcodegen.QrCode.Ecc.LOW,
        MEDIUM: qrcodegen.QrCode.Ecc.MEDIUM,
        QUARTILE: qrcodegen.QrCode.Ecc.QUARTILE,
        HIGH: qrcodegen.QrCode.Ecc.HIGH,
      };

      // Generate QR code
      const qr = qrcodegen.QrCode.encodeText(value, eccMap[errorLevel]);

      // Convert to matrix format
      const matrix: (1 | 0)[][] = [];
      for (let y = 0; y < qr.size; y++) {
        const row: (1 | 0)[] = [];
        for (let x = 0; x < qr.size; x++) {
          row.push(qr.getModule(x, y) ? 1 : 0);
        }
        matrix.push(row);
      }

      // Transform to SVG path
      const { path } = transformMatrixIntoPath(
        matrix,
        size,
        shapeOptions,
        logoSize,
      );

      return { qrMatrix: matrix, svgPath: path };
    }, [value, errorLevel, size, shapeOptions, logoSize]);

    const fillColor = useMemo(() => {
      if (gradientType && colors.length > 1) {
        return getGradientUrl(gradientId);
      }
      return colors[0] || "#000000";
    }, [gradientType, colors, gradientId]);

    const watermarkHeight = includeWatermark ? 40 : 0;
    const totalHeight = size + watermarkHeight;

    return (
      <svg
        ref={ref}
        width={size}
        height={totalHeight}
        viewBox={`0 0 ${size} ${totalHeight}`}
        className={className}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {gradientType &&
            colors.length > 1 &&
            generateGradientDef({
              gradient: gradientType,
              colors,
              size,
              id: gradientId,
            })}
        </defs>

        {/* White background */}
        <rect width={size} height={totalHeight} fill="#ffffff" />

        {/* QR code path */}
        <path d={svgPath} fill={fillColor} />

        {/* Logo in center (if provided) */}
        {logoImage && logoSize > 0 && (
          <image
            href={logoImage}
            x={(size - logoSize) / 2}
            y={(size - logoSize) / 2}
            width={logoSize}
            height={logoSize}
          />
        )}

        {/* Watermark text */}
        {includeWatermark && (
          <text
            x={size / 2}
            y={size + 25}
            textAnchor="middle"
            fill="#666666"
            fontSize="12"
            fontFamily="sans-serif"
          >
            {watermarkText}
          </text>
        )}
      </svg>
    );
  },
);

QRCodeSVGComponent.displayName = "QRCodeSVG";

export { QRCodeSVGComponent as QRCodeSVG };
