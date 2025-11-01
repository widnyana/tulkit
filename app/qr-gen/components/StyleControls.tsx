/**
 * Styling controls for QR code customization
 */

"use client";

import type { BaseShapeOptions, ShapeOptions } from "../types";
import type { GradientType } from "../gradient-utils";
import { ShapePreview } from "./ShapePreview";

interface StyleControlsProps {
  shapeOptions: ShapeOptions;
  onShapeOptionsChange: (options: ShapeOptions) => void;
  gradientType: GradientType;
  onGradientTypeChange: (type: GradientType) => void;
  colors: string[];
  onColorsChange: (colors: string[]) => void;
  logoSize: number;
  onLogoSizeChange: (size: number) => void;
}

const shapes: BaseShapeOptions[] = [
  "square",
  "circle",
  "rounded",
  "diamond",
  "triangle",
  "star",
];

const gradientTypes: { type: GradientType; label: string }[] = [
  { type: "radial", label: "Radial" },
  { type: "linear", label: "Linear" },
  { type: "linear-vertical", label: "Vertical" },
  { type: "sweep", label: "Sweep" },
  { type: "conical", label: "Conical" },
];

export function StyleControls({
  shapeOptions,
  onShapeOptionsChange,
  gradientType,
  onGradientTypeChange,
  colors,
  onColorsChange,
  logoSize,
  onLogoSizeChange,
}: StyleControlsProps) {
  return (
    <div className="space-y-6">
      {/* Module Shape */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Module Shape
        </label>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {shapes.map((shape) => (
            <button
              key={shape}
              type="button"
              onClick={() => onShapeOptionsChange({ ...shapeOptions, shape })}
              className={`p-3 border-2 rounded-lg transition-all ${
                shapeOptions.shape === shape
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <ShapePreview shape={shape} size={40} />
              <p className="text-xs mt-1 capitalize">{shape}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Eye Pattern Shape */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Corner Detection Pattern Shape
        </label>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {shapes.map((shape) => (
            <button
              key={shape}
              type="button"
              onClick={() =>
                onShapeOptionsChange({
                  ...shapeOptions,
                  eyePatternShape: shape,
                })
              }
              className={`p-3 border-2 rounded-lg transition-all ${
                shapeOptions.eyePatternShape === shape
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <ShapePreview shape={shape} size={40} />
              <p className="text-xs mt-1 capitalize">{shape}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Gap Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Module Gap: {shapeOptions.gap || 0}
          </label>
          <input
            type="range"
            min="0"
            max="4"
            step="0.5"
            value={shapeOptions.gap || 0}
            onChange={(e) =>
              onShapeOptionsChange({
                ...shapeOptions,
                gap: Number(e.target.value),
              })
            }
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Space between modules for visual effect
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Corner Gap: {shapeOptions.eyePatternGap || 0}
          </label>
          <input
            type="range"
            min="0"
            max="4"
            step="0.5"
            value={shapeOptions.eyePatternGap || 0}
            onChange={(e) =>
              onShapeOptionsChange({
                ...shapeOptions,
                eyePatternGap: Number(e.target.value),
              })
            }
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Space in corner detection patterns
          </p>
        </div>
      </div>

      {/* Color Picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Colors {colors.length > 1 ? "(Gradient)" : ""}
        </label>
        <div className="flex flex-wrap gap-2">
          {colors.map((color, index) => (
            <div key={color} className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  const newColors = [...colors];
                  newColors[index] = e.target.value;
                  onColorsChange(newColors);
                }}
                className="w-12 h-12 rounded-lg cursor-pointer"
              />
              {colors.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const newColors = colors.filter((_, i) => i !== index);
                    onColorsChange(newColors);
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {colors.length < 5 && (
            <button
              type="button"
              onClick={() => onColorsChange([...colors, "#000000"])}
              className="w-12 h-12 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 flex items-center justify-center text-gray-400 hover:text-gray-600"
            >
              +
            </button>
          )}
        </div>
      </div>

      {/* Gradient Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Gradient Type
        </label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {gradientTypes.map(({ type, label }) => (
            <button
              key={type}
              type="button"
              onClick={() => onGradientTypeChange(type)}
              className={`p-3 border-2 rounded-lg transition-all ${
                gradientType === type
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <p className="text-sm font-medium">{label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Logo Size */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Logo Size: {logoSize}px
        </label>
        <input
          type="range"
          min="0"
          max="128"
          step="32"
          value={logoSize}
          onChange={(e) => onLogoSizeChange(Number(e.target.value))}
          className="w-full"
        />
        <p className="text-xs text-gray-500 mt-1">
          {logoSize === 0
            ? "No logo"
            : "Reserve space for center logo."}
        </p>
      </div>
    </div>
  );
}
