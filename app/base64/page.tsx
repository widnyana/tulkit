"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { decodeBase64, encodeBase64 } from "@/lib/base64/base64";

type Mode = "encode" | "decode";

export default function Base64Page() {
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");
  const [singleLine, setSingleLine] = useState(false);
  const [lineWidth, setLineWidth] = useState(76);

  const widthId = useId();

  const { output, error } = useMemo(() => {
    if (input === "") return { output: "", error: "" };
    try {
      if (mode === "encode") {
        return {
          output: encodeBase64(input, { singleLine, lineWidth }),
          error: "",
        };
      }
      return { output: decodeBase64(input), error: "" };
    } catch {
      return { output: "", error: "Invalid Base64 input — cannot decode." };
    }
  }, [mode, input, singleLine, lineWidth]);

  const copyOutput = () => {
    if (output) navigator.clipboard.writeText(output);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setInput("");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
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
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Base64 Encoder / Decoder
          </h1>
          <p className="text-gray-600 mb-4">
            Encode text to Base64 or decode it back — UTF-8 safe
          </p>
          <p className="sr-only">
            Encode any text to Base64 or decode Base64 back to text, with full UTF-8 support for emoji and accented characters. By default, encoded output wraps into fixed-width rows (76 characters, the MIME standard) so every line has the same length; switch to single-line output or change the row width to fit your needs. Useful for data URIs, config values, API payloads, email attachments, and debugging encoded strings. Everything runs in your browser; nothing is sent to a server.
          </p>
        </header>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border border-gray-200">
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => switchMode("encode")}
              className={`px-6 py-2 font-medium rounded-lg transition-colors ${
                mode === "encode"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Encode
            </button>
            <button
              type="button"
              onClick={() => switchMode("decode")}
              className={`px-6 py-2 font-medium rounded-lg transition-colors ${
                mode === "decode"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Decode
            </button>
          </div>

          <div className="mb-6">
            <div className="block text-sm font-medium text-gray-700 mb-2">
              {mode === "encode" ? "Text to encode" : "Base64 to decode"}
            </div>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                mode === "encode"
                  ? "Type or paste text…"
                  : "Paste Base64 (whitespace and newlines are ignored)…"
              }
              className="min-h-[140px] font-mono text-gray-900"
            />
          </div>

          {mode === "encode" && (
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center space-x-2 cursor-pointer">
                <Checkbox
                  checked={singleLine}
                  onCheckedChange={(checked) => setSingleLine(checked === true)}
                />
                <span className="text-sm text-gray-700">Single line output</span>
              </label>

              {!singleLine && (
                <div className="flex items-center gap-2">
                  <label
                    htmlFor={widthId}
                    className="text-sm font-medium text-gray-700"
                  >
                    Line width
                  </label>
                  <input
                    id={widthId}
                    type="number"
                    min="4"
                    max="120"
                    value={lineWidth === 0 ? "" : lineWidth}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLineWidth(val === "" ? 0 : Number(val));
                    }}
                    onBlur={(e) => {
                      const val = Number(e.target.value);
                      if (Number.isNaN(val) || val < 4) setLineWidth(4);
                      else if (val > 120) setLineWidth(120);
                    }}
                    className="w-24 px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Output</h2>
            {output && (
              <button
                type="button"
                onClick={copyOutput}
                className="px-3 py-1 text-xs bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors"
              >
                Copy
              </button>
            )}
          </div>
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <Textarea
              readOnly
              value={output}
              placeholder="Result appears here…"
              className="min-h-[140px] font-mono text-gray-900 bg-gray-50"
            />
          )}
        </div>
      </div>
    </div>
  );
}
