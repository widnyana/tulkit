"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MermaidEditor } from "./components/Editor";
import { Preview } from "./components/Preview";
import { Controls } from "./components/Controls";

const STORAGE_KEY = "mermaid-diagram";

export default function MermaidEditorPage() {
  const [code, setCode] = useState("");
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setCode(saved);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, code);
    }
  }, [code, mounted]);

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between max-w-full mx-auto">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Mermaid Editor</h1>
            </div>
          </div>
          <div className="text-xs text-gray-500">Auto-saved</div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-full">
          {/* Left Column - Editor */}
          <div className="flex flex-col border-r border-gray-200 bg-white">
            <MermaidEditor value={code} onChange={setCode} />

            {/* Help Section - Collapsed at bottom */}
            <div className="border-t border-gray-200 bg-blue-50 px-4 py-2">
              <div className="text-xs text-blue-800 flex items-center gap-4">
                <span>
                  <strong>Flowchart:</strong>{" "}
                  <code className="bg-white px-1 rounded text-[10px]">graph TD; A--&gt;B;</code>
                </span>
                <span>
                  <strong>Sequence:</strong>{" "}
                  <code className="bg-white px-1 rounded text-[10px]">
                    sequenceDiagram; Alice-&gt;&gt;Bob: Hello
                  </code>
                </span>
                <a
                  href="https://mermaid.js.org/intro/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-600 ml-auto"
                >
                  Docs
                </a>
              </div>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="flex flex-col bg-white">
            <Preview code={code} />
            <Controls code={code} />
          </div>
        </div>
      </div>
    </div>
  );
}
