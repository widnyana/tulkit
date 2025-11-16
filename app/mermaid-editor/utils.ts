
/**
 * Downloads SVG content as a file
 */
export function downloadSVG(svgElement: SVGElement, filename = "diagram.svg") {
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const blob = new Blob([svgData], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Converts SVG to PNG and downloads it
 */
export function downloadPNG(svgElement: SVGElement, filename = "diagram.png") {
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  const img = new Image();
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error("Could not create PNG blob");
      }

      const pngUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(pngUrl);
      URL.revokeObjectURL(url);
    });
  };

  img.src = url;
}

/**
 * Copies text to clipboard
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand("copy");
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

/**
 * Gets the current diagram's SVG element
 */
export function getDiagramSVG(containerId: string): SVGElement | null {
  // Try to get by ID first for backward compatibility
  const containerById = document.getElementById(containerId);
  if (containerById) {
    return containerById.querySelector("svg");
  }

  // If not found by ID, try to find the SVG by other selectors
  // This handles cases where the container doesn't have a static ID
  const containerByClass = document.querySelector(".mermaid-preview-container");
  if (containerByClass) {
    return containerByClass.querySelector("svg") as SVGElement | null;
  }

  // Last resort: try to find any SVG in the preview area
  return document.querySelector(".flex-1.overflow-auto svg");
}
