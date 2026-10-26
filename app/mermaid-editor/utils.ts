export const STORAGE_KEY = "mermaid-diagram";

export const SAMPLE = `graph TD
    A[Start] --> B{Is it?}
    B -->|Yes| C[OK]
    B -->|No| D[End]`;

/** Mermaid "base" theme variables. Only `base` is customizable and only hex
 *  colors are honored (no names, rgba or "transparent"). Mermaid derives many
 *  colors from primaryColor, so every color a diagram type reads is set
 *  explicitly to keep the result predictable. */
export function mermaidThemeVariables(dark: boolean) {
  const c = dark
    ? {
        text: "#e2e8f0",
        line: "#94a3b8",
        node: "#312e81",
        nodeBorder: "#818cf8",
        nodeText: "#e0e7ff",
        alt: "#134e4a",
        altBorder: "#2dd4bf",
        altText: "#ccfbf1",
        warm: "#451a03",
        warmBorder: "#fbbf24",
        warmText: "#fef3c7",
        cluster: "#1e293b",
        clusterBorder: "#475569",
        label: "#0f172a",
        actor: "#1e1b4b",
        activation: "#3730a3",
      }
    : {
        text: "#0f172a",
        line: "#64748b",
        node: "#e0e7ff",
        nodeBorder: "#6366f1",
        nodeText: "#1e1b4b",
        alt: "#ccfbf1",
        altBorder: "#14b8a6",
        altText: "#134e4a",
        warm: "#fef3c7",
        warmBorder: "#f59e0b",
        warmText: "#451a03",
        cluster: "#f1f5f9",
        clusterBorder: "#cbd5e1",
        label: "#ffffff",
        actor: "#eff6ff",
        activation: "#dbeafe",
      };
  return {
    darkMode: dark,
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    textColor: c.text,
    lineColor: c.line,
    primaryColor: c.node,
    primaryBorderColor: c.nodeBorder,
    primaryTextColor: c.nodeText,
    secondaryColor: c.alt,
    secondaryBorderColor: c.altBorder,
    secondaryTextColor: c.altText,
    tertiaryColor: c.warm,
    tertiaryBorderColor: c.warmBorder,
    tertiaryTextColor: c.warmText,
    // flowchart
    mainBkg: c.node,
    nodeBorder: c.nodeBorder,
    nodeTextColor: c.nodeText,
    clusterBkg: c.cluster,
    clusterBorder: c.clusterBorder,
    defaultLinkColor: c.line,
    titleColor: c.text,
    edgeLabelBackground: c.label,
    // sequence
    actorBkg: c.actor,
    actorBorder: c.nodeBorder,
    actorTextColor: c.nodeText,
    actorLineColor: c.line,
    signalColor: c.text,
    signalTextColor: c.text,
    labelBoxBkgColor: c.cluster,
    labelBoxBorderColor: c.clusterBorder,
    labelTextColor: c.text,
    loopTextColor: c.text,
    activationBkgColor: c.activation,
    activationBorderColor: c.nodeBorder,
    sequenceNumberColor: c.label,
    noteBkgColor: c.warm,
    noteTextColor: c.warmText,
    noteBorderColor: c.warmBorder,
    // state / class
    labelColor: c.nodeText,
    altBackground: c.cluster,
    classText: c.nodeText,
  };
}

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
