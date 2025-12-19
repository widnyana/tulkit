import { qrcodegen } from "@/lib/qrcodegen";
import type { QROptions } from "./types";

/**
 * Generate QR code from text with specified error correction level
 * Text is passed as-is - no preprocessing for universal scanner compatibility
 */
export function generateQRCode(
  text: string,
  errorLevel: "LOW" | "MEDIUM" | "QUARTILE" | "HIGH",
): qrcodegen.QrCode {
  const eccMap = {
    LOW: qrcodegen.QrCode.Ecc.LOW,
    MEDIUM: qrcodegen.QrCode.Ecc.MEDIUM,
    QUARTILE: qrcodegen.QrCode.Ecc.QUARTILE,
    HIGH: qrcodegen.QrCode.Ecc.HIGH,
  };

  return qrcodegen.QrCode.encodeText(text, eccMap[errorLevel]);
}

/**
 * Render QR code to canvas with optional watermark
 * Layout: [Quiet Zone][QR Code][Quiet Zone][Watermark (optional)]
 */
export function renderQRToCanvas(
  qr: qrcodegen.QrCode,
  canvas: HTMLCanvasElement,
  options: QROptions,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { moduleSize, quietZone, includeWatermark } = options;
  const qrSize = qr.size;
  const watermarkHeight = includeWatermark ? 40 : 0;

  // Calculate canvas dimensions
  const totalModules = qrSize + quietZone * 2;
  canvas.width = totalModules * moduleSize;
  canvas.height = totalModules * moduleSize + watermarkHeight;

  // Fill white background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw QR code modules (black squares)
  ctx.fillStyle = "#000000";
  for (let y = 0; y < qrSize; y++) {
    for (let x = 0; x < qrSize; x++) {
      if (qr.getModule(x, y)) {
        ctx.fillRect(
          (x + quietZone) * moduleSize,
          (y + quietZone) * moduleSize,
          moduleSize,
          moduleSize,
        );
      }
    }
  }

  // Draw watermark below QR code (if enabled)
  if (includeWatermark) {
    const watermarkY = totalModules * moduleSize + 25;
    ctx.fillStyle = "#666666";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      "Generated using https://tulkit.widnyana.web.id",
      canvas.width / 2,
      watermarkY,
    );
  }
}

/**
 * Download canvas as PNG file
 */
export function downloadQRCode(
  canvas: HTMLCanvasElement,
  filename: string,
): void {
  canvas.toBlob((blob) => {
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, "image/png");
}

/**
 * Convert SVG element to PNG and download
 */
export async function downloadSVGAsPNG(
  svgElement: SVGSVGElement,
  filename: string,
  options?: {
    includeWatermark?: boolean;
    watermarkText?: string;
  },
): Promise<void> {
  console.log("[downloadSVGAsPNG] Received options:", options);
  console.log(
    "[downloadSVGAsPNG] includeWatermark value:",
    options?.includeWatermark,
  );
  return new Promise((resolve, reject) => {
    try {
      const svgWidth = Number.parseFloat(
        svgElement.getAttribute("width") || "0",
      );
      const svgHeight = Number.parseFloat(
        svgElement.getAttribute("height") || "0",
      );

      // Get SVG data
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const svgUrl = URL.createObjectURL(svgBlob);

      // Create image from SVG
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const padding = 100; // 100px padding as requested

        canvas.width = svgWidth + padding * 2;
        canvas.height = svgHeight + padding * 2;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(svgUrl);
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(img, padding, padding);

        console.log(
          "[downloadSVGAsPNG] Checking watermark condition:",
          options?.includeWatermark,
        );
        if (options?.includeWatermark) {
          console.log("[downloadSVGAsPNG] Drawing watermark!");
          const qrSize = svgWidth;
          const watermarkY = padding + qrSize + 25;
          ctx.fillStyle = "#666666";
          ctx.font = "12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(
            options.watermarkText ||
              "Generated using https://tulkit.widnyana.web.id",
            canvas.width / 2,
            watermarkY,
          );
        } else {
          console.log("[downloadSVGAsPNG] Skipping watermark");
        }

        // Download
        canvas.toBlob((blob) => {
          if (!blob) {
            URL.revokeObjectURL(svgUrl);
            reject(new Error("Could not create blob"));
            return;
          }

          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${filename}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          URL.revokeObjectURL(svgUrl);
          resolve();
        }, "image/png");
      };

      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        reject(new Error("Could not load SVG"));
      };

      img.src = svgUrl;
    } catch (error) {
      reject(error);
    }
  });
}
