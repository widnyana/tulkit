"use client";

import { Effect } from "effect";
import type { StyleSpecification } from "maplibre-gl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import type { GpxRequestError } from "./errors.ts";
import {
  DEFAULT_REQUEST_POLICY,
  type RequestPolicy,
  requestJson,
} from "./http.ts";

const MAP_STYLE_LIGHT = "https://tiles.openfreemap.org/styles/liberty";

type Rgba = { r: number; g: number; b: number; a: number };

const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_PATTERN =
  /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i;

function parseColor(value: string): Rgba | null {
  const hex = HEX_PATTERN.exec(value);
  if (hex) {
    const digits = hex[1];
    if (digits.length === 3) {
      const [r, g, b] = digits.split("").map((digit) => digit + digit);
      return {
        r: Number.parseInt(r, 16),
        g: Number.parseInt(g, 16),
        b: Number.parseInt(b, 16),
        a: 1,
      };
    }
    const r = Number.parseInt(digits.slice(0, 2), 16);
    const g = Number.parseInt(digits.slice(2, 4), 16);
    const b = Number.parseInt(digits.slice(4, 6), 16);
    const a =
      digits.length === 8 ? Number.parseInt(digits.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }
  const rgb = RGB_PATTERN.exec(value);
  if (rgb) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
      a: rgb[4] === undefined ? 1 : Number(rgb[4]),
    };
  }
  return null;
}

function toCss({ r, g, b, a }: Rgba): string {
  const channels = [r, g, b].map((channel) =>
    Math.round(Math.min(255, Math.max(0, channel))),
  );
  const alpha = a >= 1 ? 1 : Math.max(0, a);
  if (alpha >= 1) {
    const hex = channels
      .map((channel) => channel.toString(16).padStart(2, "0"))
      .join("");
    return `#${hex}`;
  }
  return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${Number(alpha.toFixed(3))})`;
}

function rgbToHsl({ r, g, b }: Rgba): [number, number, number] {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  if (max === min) return [0, 0, lightness];
  const delta = max - min;
  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue: number;
  if (max === red) hue = ((green - blue) / delta + (green < blue ? 6 : 0)) / 6;
  else if (max === green) hue = ((blue - red) / delta + 2) / 6;
  else hue = ((red - green) / delta + 4) / 6;
  return [hue, saturation, lightness];
}

function hslToRgb(
  hue: number,
  saturation: number,
  lightness: number,
): [number, number, number] {
  if (saturation === 0) {
    const channel = lightness * 255;
    return [channel, channel, channel];
  }
  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  const channel = (offset: number) => {
    let t = offset;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [
    channel(hue + 1 / 3) * 255,
    channel(hue) * 255,
    channel(hue - 1 / 3) * 255,
  ];
}

type PaletteRule = {
  lightness: (value: number) => number;
  saturation: number;
};

const FILL_RULE: PaletteRule = {
  lightness: (l) => 0.035 + 0.15 * l,
  saturation: 0.7,
};
const LINE_RULE: PaletteRule = {
  lightness: (l) => 0.055 + 0.26 * l,
  saturation: 0.12,
};
const TEXT_RULE: PaletteRule = {
  lightness: (l) => 0.58 + 0.38 * l,
  saturation: 0.35,
};
const HALO_RULE: PaletteRule = {
  lightness: (l) => 0.02 + 0.05 * l,
  saturation: 0.3,
};

function ruleFor(property: string): PaletteRule | null {
  if (property === "background-color") return null;
  if (property.startsWith("text-")) {
    return property === "text-halo-color" ? HALO_RULE : TEXT_RULE;
  }
  if (property.startsWith("icon-")) return TEXT_RULE;
  if (property.includes("line")) return LINE_RULE;
  if (property.startsWith("fill-")) return FILL_RULE;
  return null;
}

const DARK_BACKGROUND = "#0c0d10";

function darkenColor(value: string, property: string): string {
  const parsed = parseColor(value);
  if (parsed === null) return value;
  if (property === "background-color") return DARK_BACKGROUND;
  const rule = ruleFor(property);
  if (rule === null) return value;
  const [hue, saturation, lightness] = rgbToHsl(parsed);
  const [r, g, b] = hslToRgb(
    hue,
    Math.min(1, saturation * rule.saturation),
    Math.min(0.92, Math.max(0, rule.lightness(lightness))),
  );
  return toCss({ r, g, b, a: parsed.a });
}

function transformValue(value: unknown, property: string): unknown {
  if (typeof value === "string") {
    return parseColor(value) === null ? value : darkenColor(value, property);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => transformValue(entry, property));
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      result[key] = transformValue(entry, property);
    }
    return result;
  }
  return value;
}

function darkenStyle(style: StyleSpecification): StyleSpecification {
  const layers = style.layers.map((layer) => {
    if (!("paint" in layer) || layer.paint === undefined) return layer;
    const paint: Record<string, unknown> = {};
    for (const [property, value] of Object.entries(layer.paint)) {
      paint[property] = transformValue(value, property);
    }
    return { ...layer, paint } as typeof layer;
  });
  return { ...style, layers };
}

let darkStyleRequest: Promise<StyleSpecification | null> | null = null;

function requestDarkStyle(
  policy: RequestPolicy = DEFAULT_REQUEST_POLICY,
): Effect.Effect<StyleSpecification | null, GpxRequestError> {
  return requestJson(MAP_STYLE_LIGHT, {}, policy).pipe(
    Effect.map((data) => darkenStyle(data as StyleSpecification)),
  );
}

export function useMapStyle(): string | StyleSpecification {
  const { resolvedTheme } = useTheme();
  const [style, setStyle] = useState<string | StyleSpecification>(
    MAP_STYLE_LIGHT,
  );

  useEffect(() => {
    let cancelled = false;
    if (resolvedTheme !== "dark") {
      setStyle(MAP_STYLE_LIGHT);
      return;
    }
    darkStyleRequest ??= Effect.runPromise(
      requestDarkStyle().pipe(Effect.catch(() => Effect.succeed(null))),
    );
    void darkStyleRequest.then((next) => {
      if (!cancelled) setStyle(next ?? MAP_STYLE_LIGHT);
    });
    return () => {
      cancelled = true;
    };
  }, [resolvedTheme]);

  return style;
}
