"use client";

import { toast } from "sonner";
import { downloadPNG, downloadSVG, copyToClipboard, getDiagramSVG } from "../utils";

interface ControlsProps {
  code: string;
}

export function Controls({ code }: ControlsProps) {
  const handleDownloadPNG = () => {
    const svg = getDiagramSVG("mermaid-preview");
    if (!svg) {
      toast.error("No diagram to export");
      return;
    }

    try {
      downloadPNG(svg);
      toast.success("PNG downloaded successfully");
    } catch (error) {
      toast.error("Failed to download PNG");
    }
  };

  const handleDownloadSVG = () => {
    const svg = getDiagramSVG("mermaid-preview");
    if (!svg) {
      toast.error("No diagram to export");
      return;
    }

    try {
      downloadSVG(svg);
      toast.success("SVG downloaded successfully");
    } catch (error) {
      toast.error("Failed to download SVG");
    }
  };

  const handleCopyCode = async () => {
    if (!code.trim()) {
      toast.error("No code to copy");
      return;
    }

    try {
      await copyToClipboard(code);
      toast.success("Code copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy code");
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 px-6 py-4">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleDownloadPNG}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium
                     rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2
                     focus:ring-blue-500 focus:ring-offset-2"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          Download PNG
        </button>

        <button
          onClick={handleDownloadSVG}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium
                     rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2
                     focus:ring-green-500 focus:ring-offset-2"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
            />
          </svg>
          Download SVG
        </button>

        <button
          onClick={handleCopyCode}
          className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium
                     rounded-lg hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2
                     focus:ring-gray-400 focus:ring-offset-2"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Copy Code
        </button>
      </div>
    </div>
  );
}
