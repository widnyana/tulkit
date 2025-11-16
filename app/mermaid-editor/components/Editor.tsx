"use client";

import { useState, useEffect } from "react";
import Editor from "react-simple-code-editor";
import { highlight } from "prismjs";
import "prismjs/themes/prism-tomorrow.css";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

// Custom Mermaid syntax highlighter
function highlightMermaid(code: string): string {
  const keywords = /\b(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|journey|C4Context|mindmap|timeline|sankey|quadrantChart|requirementDiagram|TD|TB|BT|RL|LR|participant|actor|loop|alt|opt|par|and|rect|Note|activate|deactivate|class|state|dateFormat|title|section)\b/g;
  const operators = /(-->|->|---|==|\.\.>|<\.\.|\||\[|\]|\{|\}|\(|\)|:)/g;
  const strings = /(".*?"|'.*?')/g;
  const comments = /(%%.*)/g;

  return code
    .replace(comments, '<span style="color: #6a9955;">$1</span>')
    .replace(keywords, '<span style="color: #c586c0; font-weight: 600;">$1</span>')
    .replace(strings, '<span style="color: #ce9178;">$1</span>')
    .replace(operators, '<span style="color: #d4d4d4;">$1</span>');
}

export function MermaidEditor({ value, onChange }: EditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-200 px-6 py-4 shrink-0">
        <label className="text-lg font-semibold text-indigo-900">Mermaid Code</label>
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
                fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace",
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
