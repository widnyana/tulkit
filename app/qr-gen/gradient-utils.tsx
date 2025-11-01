/**
 * SVG gradient generation utilities
 * Adapted from react-native-qrcode-skia gradient components
 */

import type { ReactElement } from "react";

export type GradientType =
  | "radial"
  | "linear"
  | "linear-vertical"
  | "sweep"
  | "conical";

type GradientProps = {
  gradient: GradientType;
  colors: string[];
  id: string;
};

export function generateGradientDef({
  gradient,
  colors,
  id,
}: GradientProps): ReactElement | null {
  const colorStops = colors.map((color, index) => (
    <stop
      key={color}
      offset={`${(index / (colors.length - 1)) * 100}%`}
      stopColor={color}
    />
  ));

  switch (gradient) {
    case "radial":
      return (
        <radialGradient id={id} cx="50%" cy="50%" r="50%">
          {colorStops}
        </radialGradient>
      );

    case "linear":
      return (
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          {colorStops}
        </linearGradient>
      );

    case "linear-vertical":
      return (
        <linearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
          {colorStops}
        </linearGradient>
      );

    case "sweep":
      // SVG doesn't have native sweep gradient, we'll use conical
      return (
        <radialGradient id={id} cx="50%" cy="50%" r="50%">
          {colors.map((color, index) => (
            <stop
              key={color}
              offset={`${(index / colors.length) * 100}%`}
              stopColor={color}
            />
          ))}
        </radialGradient>
      );

    case "conical":
      // Approximate conical gradient with radial
      return (
        <radialGradient id={id} cx="50%" cy="50%" r="50%" fr="8%">
          {colorStops}
        </radialGradient>
      );

    default:
      return null;
  }
}

export function getGradientUrl(id: string): string {
  return `url(#${id})`;
}
