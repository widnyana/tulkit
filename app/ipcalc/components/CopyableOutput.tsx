"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function CopyableOutput({
  markdown,
  plaintext,
}: {
  markdown: string;
  plaintext: string;
}) {
  const [format, setFormat] = useState<"markdown" | "plain">("markdown");
  const [copied, setCopied] = useState(false);

  const current = format === "markdown" ? markdown : plaintext;

  const handleCopy = () => {
    navigator.clipboard.writeText(current);
    toast.success("Copied to clipboard");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Copyable Output</h3>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
            {(["markdown", "plain"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={`px-3 py-1 transition-colors ${
                  format === f
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {f === "markdown" ? "Markdown" : "Plain"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <pre className="text-sm font-mono text-gray-900 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
        {current}
      </pre>
    </div>
  );
}
