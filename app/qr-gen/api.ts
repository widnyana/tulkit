import { qrcodegen } from "@/lib/qrcodegen";
import { SITE_URL } from "@/lib/site";
import { transformMatrixIntoPath } from "./svg-renderer";
import type { QrApiRequest, QrEccLevel, QrGradient } from "./request";

/**
 * SVG string renderer for the QR API. Mirrors the geometry and markup of
 * components/QRCodeSVG.tsx without React; request parsing lives in
 * ./request.ts. Imports lib/qrcodegen, so it cannot be loaded by
 * node:test strip-types — behavior is covered by e2e/qr-api.spec.ts.
 */

// ---- gradient defs (mirrors gradient-utils.tsx markup) ----

type GradientDefArgs = {
  gradient: QrGradient;
  colors: string[];
  id: string;
  size: number;
};

function stopsMarkup(colors: string[], divideByLength: boolean): string {
  const denom = divideByLength ? colors.length : colors.length - 1;
  return colors
    .map(
      (color, index) =>
        `<stop offset="${(index / denom) * 100}%" stop-color="${color}"/>`,
    )
    .join("");
}

function gradientDefMarkup({ gradient, colors, id }: GradientDefArgs): string {
  switch (gradient) {
    case "radial":
      return `<radialGradient id="${id}" cx="50%" cy="50%" r="50%">${stopsMarkup(colors, false)}</radialGradient>`;
    case "linear":
      return `<linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">${stopsMarkup(colors, false)}</linearGradient>`;
    case "linear-vertical":
      return `<linearGradient id="${id}" x1="0%" y1="0%" x2="0%" y2="100%">${stopsMarkup(colors, false)}</linearGradient>`;
    case "sweep":
      // SVG has no native sweep; radial with evenly spaced offsets, same as UI
      return `<radialGradient id="${id}" cx="50%" cy="50%" r="50%">${stopsMarkup(colors, true)}</radialGradient>`;
    case "conical":
      return `<radialGradient id="${id}" cx="50%" cy="50%" r="50%" fr="8%">${stopsMarkup(colors, false)}</radialGradient>`;
  }
}

export async function runQrOperation(req: QrApiRequest): Promise<string> {
  const eccMap: Record<QrEccLevel, qrcodegen.QrCode.Ecc> = {
    LOW: qrcodegen.QrCode.Ecc.LOW,
    MEDIUM: qrcodegen.QrCode.Ecc.MEDIUM,
    QUARTILE: qrcodegen.QrCode.Ecc.QUARTILE,
    HIGH: qrcodegen.QrCode.Ecc.HIGH,
  };

  const qr = qrcodegen.QrCode.encodeText(req.text, eccMap[req.errorCorrection]);
  const modules = qr.size;
  const matrix: (1 | 0)[][] = [];
  for (let y = 0; y < modules; y++) {
    const row: (1 | 0)[] = [];
    for (let x = 0; x < modules; x++) {
      row.push(qr.getModule(x, y) ? 1 : 0);
    }
    matrix.push(row);
  }

  const { margin, size } = req;
  const modulePx = size / (modules + 2 * margin);
  const innerPx = modulePx * modules;
  const offset = modulePx * margin;

  const logoSize = req.logoSize ?? 0;
  const { path } = transformMatrixIntoPath(
    matrix,
    innerPx,
    req.shapeOptions,
    logoSize,
  );

  const useGradient = req.gradient !== undefined && req.colors.length > 1;
  const gradientId = "qr-grad";
  const fill = useGradient ? `url(#${gradientId})` : req.colors[0];

  const watermarkHeight = req.watermark ? 40 : 0;
  const totalHeight = size + watermarkHeight;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${totalHeight}" viewBox="0 0 ${size} ${totalHeight}">`,
  );
  if (useGradient) {
    parts.push(
      `<defs>${gradientDefMarkup({ gradient: req.gradient as QrGradient, colors: req.colors, id: gradientId, size })}</defs>`,
    );
  }
  parts.push(`<rect width="${size}" height="${totalHeight}" fill="#ffffff"/>`);
  parts.push(
    `<path d="${path}" fill="${fill}" transform="translate(${offset} ${offset})"/>`,
  );
  if (req.logoImage && logoSize > 0) {
    parts.push(
      `<image href="${req.logoImage}" x="${(size - logoSize) / 2}" y="${(size - logoSize) / 2}" width="${logoSize}" height="${logoSize}"/>`,
    );
  }
  if (req.watermark) {
    parts.push(
      `<text x="${size / 2}" y="${size + 25}" textAnchor="middle" fill="#666666" fontSize="12" fontFamily="sans-serif">Generated using ${SITE_URL}</text>`,
    );
  }
  parts.push("</svg>");
  return parts.join("");
}
