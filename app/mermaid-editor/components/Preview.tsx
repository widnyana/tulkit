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

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "loose",
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
          setError(null);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
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

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 50));
  const handleZoomReset = () => setZoom(100);

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Preview</h2>
            <p className="text-sm text-gray-600 mt-1">
              Live preview of your diagram
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
              title="Zoom out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                />
              </svg>
            </button>
            <span className="text-sm text-gray-700 font-medium min-w-[3rem] text-center">
              {zoom}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
              title="Zoom in"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                />
              </svg>
            </button>
            <button
              onClick={handleZoomReset}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors text-xs"
              title="Reset zoom"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50">
        <div
          className="min-h-full flex items-center justify-center p-6"
          style={{
            minWidth: `${zoom}%`,
            minHeight: `${zoom}%`,
          }}
        >
          {error && (
            <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-lg max-w-2xl">
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
                  <h3 className="text-sm font-semibold text-red-800">Syntax Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error.message}</p>
                </div>
              </div>
            </div>
          )}

          {isRendering && !error && (
            <div className="text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
              <p className="text-sm">Rendering diagram...</p>
            </div>
          )}

          {!code.trim() && !error && !isRendering && (
            <div className="text-center text-gray-400">
              <svg
                className="w-16 h-16 mx-auto mb-4"
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
              <p className="text-sm">Start typing to see your diagram</p>
            </div>
          )}

          <div
            ref={containerRef}
            id="mermaid-preview"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: "center",
              transition: "transform 0.2s ease-in-out",
            }}
          />
        </div>
      </div>
    </div>
  );
}
