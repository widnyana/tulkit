"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Editor } from "./components/Editor";
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto p-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
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
            Back to Home
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mermaid Editor</h1>
          <p className="text-gray-600">
            Create and export diagrams using Mermaid syntax. Your work is automatically saved.
          </p>
        </div>

        {/* Split-screen Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-250px)]">
          {/* Left Panel - Editor */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
            <Editor value={code} onChange={setCode} />
          </div>

          {/* Right Panel - Preview */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
            <Preview code={code} />
            <Controls code={code} />
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-blue-900 mb-2">Quick Reference</h2>
          <div className="text-sm text-blue-800 space-y-1">
            <p>
              <strong>Flowchart:</strong> <code className="bg-white px-1 rounded">graph TD; A--&gt;B;</code>
            </p>
            <p>
              <strong>Sequence:</strong>{" "}
              <code className="bg-white px-1 rounded">sequenceDiagram; Alice-&gt;&gt;Bob: Hello</code>
            </p>
            <p>
              <strong>Class:</strong>{" "}
              <code className="bg-white px-1 rounded">classDiagram; class Animal</code>
            </p>
            <p>
              Learn more at{" "}
              <a
                href="https://mermaid.js.org/intro/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-600"
              >
                mermaid.js.org
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
