"use client";

import { useState, useEffect } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";

// Define Mermaid language for Prism
const defineMermaidLanguage = () => {
  if (!Prism.languages.mermaid) {
    Prism.languages.mermaid = {
      comment: {
        pattern: /%%.*/,
        greedy: true,
      },
      keyword: {
        pattern:
          /\b(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|journey|C4Context|mindmap|timeline|sankey|quadrantChart|requirementDiagram|TD|TB|BT|RL|LR|participant|actor|loop|alt|opt|par|and|rect|Note|activate|deactivate|class|state|dateFormat|title|section)\b/,
        greedy: true,
      },
      string: {
        pattern: /(["'])(?:\\.|(?!\1)[^\\\r\n])*\1/,
        greedy: true,
      },
      operator: {
        pattern: /(-->|->|---|==|\.\.>|<\.\.|\||\[|\]|\{|\}|\(|\)|:)/,
        greedy: true,
      },
      punctuation: /[{}[\];(),]/,
    };
  }
};

// Use Prism for Mermaid syntax highlighting
function highlightMermaid(code: string): string {
  defineMermaidLanguage(); // Ensure the language is defined before highlighting
  try {
    return Prism.highlight(code, Prism.languages.mermaid, "mermaid");
  } catch (e) {
    // If there's an error, return the code without highlighting
    console.error("Prism highlighting error:", e);
    return code;
  }
}

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function MermaidEditor({ value, onChange }: EditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-200 px-6 py-4 shrink-0">
        <label className="text-lg font-semibold text-indigo-900">
          Mermaid Code
        </label>
        <p className="text-sm text-indigo-700 mt-1">
          Write your Mermaid diagram syntax here
        </p>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        {!mounted ? (
          <div className="w-full h-full border border-gray-300 rounded-lg p-4 bg-gray-900 font-mono text-sm text-gray-300">
            Loading editor...
          </div>
        ) : (
          <div className="w-full h-full border border-indigo-200 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent overflow-auto">
            <Editor
              value={value}
              onValueChange={onChange}
              highlight={highlightMermaid}
              padding={16}
              placeholder="graph TD&#10;    A[Start] --> B{Is it?}&#10;    B -->|Yes| C[OK]&#10;    B -->|No| D[End]"
              style={{
                fontFamily:
                  "'Fira Code', 'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace",
                fontSize: 15,
                lineHeight: 1.6,
                backgroundColor: "#1e1e1e",
                color: "#d4d4d4",
                minHeight: "auto",
              }}
              textareaClassName="outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
