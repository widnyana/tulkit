"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import type { MermaidError } from "../types";

interface PreviewProps {
  code: string;
}

export function Preview({ code }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<MermaidError | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "loose",
      fontSize: 16,
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      themeVariables: {
        fontSize: "16px",
        fontWeight: "normal",
        primaryTextColor: "#374151", // gray-700
        primaryColor: "#ffffff", // white background
        primaryBorderColor: "#9ca3af", // gray-400
        lineColor: "#9ca3af", // gray-400
        secondaryColor: "#ffffff", // white
        tertiaryColor: "#ffffff", // white
        background: "#ffffff",
        mainBkg: "#ffffff", // node background
        secondBkg: "#ffffff", // secondary background
        mainContrastColor: "#000000",
        // Line width settings
        strokeWidth: 2, // Base stroke width
        edgeWidth: 8, // Thick edge/line width for node connections
        // Flowchart specific
        nodeBkg: "#ffffff",
        nodeBorder: "#9ca3af",
        nodeBorderWidth: 2, // Standard node borders
        clusterBkg: "#ffffff",
        clusterBorder: "#9ca3af",
        clusterBorderWidth: 2, // Standard cluster borders
        defaultLinkColor: "#9ca3af",
        titleColor: "#374151",
        edgeLabelBackground: "#ffffff",
      },
      flowchart: {
        htmlLabels: true,
        curve: "basis",
        lineThickness: 8, // Thickness of connection lines
      },
      sequence: {
        noteFontSize: 16,
        noteMargin: 10,
        messageFontSize: 16,
      },
      class: {
        arrowThickness: 8, // Thickness of arrows/lines in class diagrams
        edgeThickness: 8, // Thickness of edges
      },
    });
  }, []);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current || !code.trim()) {
        setError(null);
        return;
      }

      setIsRendering(true);

      try {
        // Clear previous content
        containerRef.current.innerHTML = "";

        // Generate unique ID for this render
        const id = `mermaid-${Date.now()}`;

        // Render the diagram
        const { svg } = await mermaid.render(id, code);

        if (containerRef.current) {
          containerRef.current.innerHTML = svg;

          // Find the SVG element and ensure it's sized properly
          const svgElement = containerRef.current.querySelector("svg");
          if (svgElement) {
            // Store original dimensions (unused but kept for potential future use)
            const _originalWidth = svgElement.getAttribute("width");
            const _originalHeight = svgElement.getAttribute("height");

            // Remove fixed dimensions to allow proper scaling
            svgElement.removeAttribute("width");
            svgElement.removeAttribute("height");

            // Apply sizing styles
            svgElement.style.width = "100%";
            svgElement.style.height = "auto";
            svgElement.style.maxWidth = "100%";
            svgElement.style.display = "block";

            // Create a style element to override stroke widths for connector lines specifically
            const style = document.createElement("style");
            style.textContent = `
              svg g.edgePath path,
              svg path.edge,
              svg path.path,
              svg line.edge,
              svg g.edgePaths path,
              svg .edge polygon,
              svg .edge polyline {
                stroke-width: 2 !important;  /* More reasonable thickness */
                stroke: #9ca3af !important;  /* gray-400 */
              }
              svg .edge polygon {
                fill: #9ca3af !important;
              }
            `;

            // Add the style to the SVG element
            svgElement.appendChild(style);
          }

          setError(null);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError({ message: errorMessage });
      } finally {
        setIsRendering(false);
      }
    };

    // Debounce rendering
    const timer = setTimeout(() => {
      renderDiagram();
    }, 500);

    return () => clearTimeout(timer);
  }, [code]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 500));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 25));
  const handleZoomReset = () => {
    setZoom(100);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setStartPan({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanOffset({
      x: e.clientX - startPan.x,
      y: e.clientY - startPan.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-indigo-900">Preview</h2>
            <p className="text-sm text-indigo-700 mt-1">
              Click and drag to pan • Use buttons to zoom
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-2 text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100 rounded-lg transition-colors shadow-sm"
              title="Zoom out (10%)"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                />
              </svg>
            </button>
            <span className="text-sm text-indigo-900 font-semibold min-w-[3.5rem] text-center bg-white px-2 py-1 rounded border border-indigo-200">
              {zoom}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-2 text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100 rounded-lg transition-colors shadow-sm"
              title="Zoom in (10%)"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleZoomReset}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100 bg-white rounded-lg transition-colors border border-indigo-200 shadow-sm"
              title="Reset view"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <section
        aria-label="Diagram preview area"
        className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-indigo-50"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
      >
        <div
          className="min-h-full flex items-center justify-center p-6"
          style={{
            minWidth: `${zoom}%`,
            minHeight: `${zoom}%`,
          }}
        >
          {error && (
            <div className="m-6 p-4 bg-red-50 border border-red-300 rounded-lg shadow-sm max-w-2xl">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h3 className="text-sm font-semibold text-red-800">
                    Syntax Error
                  </h3>
                  <p className="text-sm text-red-700 mt-1">{error.message}</p>
                </div>
              </div>
            </div>
          )}

          {isRendering && !error && (
            <div className="text-indigo-600">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Rendering diagram...</p>
            </div>
          )}

          {!code.trim() && !error && !isRendering && (
            <div className="text-center text-gray-400">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-indigo-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-sm text-indigo-400 font-medium">
                Start typing to see your diagram
              </p>
            </div>
          )}

          <div
            ref={containerRef}
            className="mermaid-preview-container"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom / 100})`,
              transformOrigin: "center",
              transition: isPanning ? "none" : "transform 0.2s ease-in-out",
              pointerEvents: "none",
              width: "100%",
              height: "100%",
            }}
          />
        </div>
      </section>
    </div>
  );
}
