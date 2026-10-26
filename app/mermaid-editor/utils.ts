export const STORAGE_KEY = "mermaid-diagram";

export const SAMPLE = `graph TD
    A[Start] --> B{Is it?}
    B -->|Yes| C[OK]
    B -->|No| D[End]`;

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadSVG(svg: SVGElement, filename = "diagram.svg") {
  const data = new XMLSerializer().serializeToString(svg);
  saveBlob(new Blob([data], { type: "image/svg+xml" }), filename);
}

/** Rasterize the diagram at 2x. The preview is rendered with htmlLabels off, so
 *  the SVG has no foreignObject and the canvas is not tainted. */
export async function downloadPNG(svg: SVGElement, filename = "diagram.png") {
  const box = svg.getBoundingClientRect();
  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute("width", String(box.width));
  clone.setAttribute("height", String(box.height));
  const data = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(
    new Blob([data], { type: "image/svg+xml;charset=utf-8" }),
  );
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(box.width * scale);
    canvas.height = Math.ceil(box.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, "image/png"),
    );
    if (!png) throw new Error("Could not create PNG");
    saveBlob(png, filename);
  } finally {
    URL.revokeObjectURL(url);
  }
}
