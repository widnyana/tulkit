"use client";

import { useState, useEffect } from "react";
import Editor from "react-simple-code-editor";
import { highlight, languages } from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism.css";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function MermaidEditor({ value, onChange }: EditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const highlightCode = (code: string) => {
    try {
      return highlight(code, languages.javascript, "javascript");
    } catch {
      return code;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 shrink-0">
        <label className="text-lg font-semibold text-gray-900">Mermaid Code</label>
        <p className="text-sm text-gray-600 mt-1">
          Write your Mermaid diagram syntax here
        </p>
      </div>

      <div className="flex-1 p-6">
        {!mounted ? (
          <div className="w-full h-full border border-gray-300 rounded-lg p-4 bg-white font-mono text-sm">
            Loading editor...
          </div>
        ) : (
          <div
            className="w-full h-full border border-gray-300 rounded-lg overflow-auto
                       focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent"
          >
            <Editor
              value={value}
              onValueChange={onChange}
              highlight={highlightCode}
              padding={16}
              placeholder="graph TD&#10;    A[Start] --> B{Is it?}&#10;    B -->|Yes| C[OK]&#10;    B -->|No| D[End]"
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 14,
                minHeight: "100%",
                backgroundColor: "#ffffff",
              }}
              textareaClassName="outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
