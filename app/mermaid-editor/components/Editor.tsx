"use client";

import { useId } from "react";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function Editor({ value, onChange }: EditorProps) {
  const textareaId = useId();

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <label htmlFor={textareaId} className="text-lg font-semibold text-gray-900">
          Mermaid Code
        </label>
        <p className="text-sm text-gray-600 mt-1">
          Write your Mermaid diagram syntax here
        </p>
      </div>

      <div className="flex-1 p-6">
        <textarea
          id={textareaId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-full px-4 py-3 font-mono text-sm text-gray-900
                     bg-white border border-gray-300 rounded-lg resize-none
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     placeholder:text-gray-400"
          placeholder="graph TD&#10;    A[Start] --> B{Is it?}&#10;    B -->|Yes| C[OK]&#10;    B -->|No| D[End]"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
