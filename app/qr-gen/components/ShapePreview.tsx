/**
 * Visual preview of QR code module shapes
 */

"use client";

import React from "react";
import type { BaseShapeOptions } from "../types";

interface ShapePreviewProps {
  shape: BaseShapeOptions;
  size?: number;
  color?: string;
}

export function ShapePreview({
  shape,
  size = 40,
  color = "#000000",
}: ShapePreviewProps) {
  const renderShape = () => {
    const center = size / 2;
    const shapeSize = size * 0.7;
    const radius = shapeSize / 2;

    switch (shape) {
      case "square":
        return (
          <rect
            x={(size - shapeSize) / 2}
            y={(size - shapeSize) / 2}
            width={shapeSize}
            height={shapeSize}
            fill={color}
          />
        );

      case "circle":
        return <circle cx={center} cy={center} r={radius} fill={color} />;

      case "rounded": {
        const cornerRadius = shapeSize * 0.2;
        return (
          <rect
            x={(size - shapeSize) / 2}
            y={(size - shapeSize) / 2}
            width={shapeSize}
            height={shapeSize}
            rx={cornerRadius}
            ry={cornerRadius}
            fill={color}
          />
        );
      }

      case "diamond": {
        const offset = (size - shapeSize) / 2;
        return (
          <path
            d={`M${center} ${offset} L${size - offset} ${center} L${center} ${size - offset} L${offset} ${center} Z`}
            fill={color}
          />
        );
      }

      case "triangle": {
        const offset = (size - shapeSize) / 2;
        return (
          <path
            d={`M${center} ${offset} L${size - offset} ${size - offset} L${offset} ${size - offset} Z`}
            fill={color}
          />
        );
      }

      case "star": {
        const outerRadius = radius;
        const innerRadius = radius * 0.4;
        let path = `M${center} ${center - outerRadius}`;
        for (let i = 0; i < 10; i++) {
          const angle = (Math.PI / 5) * i - Math.PI / 2;
          const r = i % 2 === 0 ? outerRadius : innerRadius;
          const x = center + r * Math.cos(angle);
          const y = center + r * Math.sin(angle);
          path += ` L${x} ${y}`;
        }
        return <path d={`${path} Z`} fill={color} />;
      }

      default:
        return null;
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto"
    >
      {renderShape()}
    </svg>
  );
}
