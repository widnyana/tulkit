"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  base64ToHex,
  decodeBase64,
  encodeBase64,
  hexToBase64,
} from "@/lib/base64/base64.ts";
import { decodeJwt } from "@/lib/base64/jwt.ts";
import { FilePanel } from "./components/FilePanel";

type Mode = "encode" | "decode" | "file" | "jwt" | "hex";
type HexDir = "toBase64" | "toHex";

const MODES: { id: Mode; label: string }[] = [
  { id: "encode", label: "Encode" },
  { id: "decode", label: "Decode" },
  { id: "file", label: "File" },
  { id: "jwt", label: "JWT" },
  { id: "hex", label: "Hex" },
];

export default function Base64Page() {
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");
  const [singleLine, setSingleLine] = useState(false);
  const [lineWidth, setLineWidth] = useState(76);
  const [urlSafe, setUrlSafe] = useState(false);
  const [hexDir, setHexDir] = useState<HexDir>("toBase64");

  const widthId = useId();

  const inputBytes = useMemo(
    () => new TextEncoder().encode(input).length,
    [input],
  );

  const text = useMemo(() => {
    if (mode === "file" || mode === "jwt" || input === "") {
      return { output: "", error: "" };
    }
    try {
      if (mode === "encode") {
        return {
          output: encodeBase64(input, { singleLine, lineWidth, urlSafe }),
          error: "",
        };
      }
      if (mode === "decode") {
        return { output: decodeBase64(input), error: "" };
      }
      const output =
        hexDir === "toBase64" ? hexToBase64(input) : base64ToHex(input);
      return { output, error: "" };
    } catch {
      const error =
        mode === "hex"
          ? "Invalid input for this conversion."
          : mode === "decode"
            ? "Invalid Base64 input — cannot decode."
            : "Cannot encode this input.";
      return { output: "", error };
    }
  }, [mode, input, singleLine, lineWidth, urlSafe, hexDir]);

  const jwt = useMemo(() => {
    if (mode !== "jwt" || input === "") return null;
    try {
      return { data: decodeJwt(input), error: "" };
    } catch (e) {
      return { data: null, error: (e as Error).message };
    }
  }, [mode, input]);

  const copy = (value: string) => {
    if (value) navigator.clipboard.writeText(value);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setInput("");
  };

  const inputLabel =
    mode === "encode"
      ? "Text to encode"
      : mode === "decode"
        ? "Base64 to decode"
        : mode === "jwt"
          ? "JWT to decode"
          : hexDir === "toBase64"
            ? "Hex to convert"
            : "Base64 to convert";

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
            Encode, decode, inspect JWTs, and convert files — UTF-8 safe
          </p>
          <p className="sr-only">
            Encode text to Base64 or decode it back with full UTF-8 support,
            convert files to Base64 or data URIs and back, decode JWT headers
            and payloads, and convert between hex and Base64. Encoded output
            wraps into fixed-width rows (76 characters, the MIME standard) by
            default; switch to single-line, URL-safe (base64url), or a custom
            row width. Useful for data URIs, config values, API tokens, and
            inspecting encoded strings. Everything runs in your browser; nothing
            is sent to a server.
          </p>
        </header>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border border-gray-200">
          <div className="flex flex-wrap gap-2 mb-6">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => switchMode(m.id)}
                className={`px-6 py-2 font-medium rounded-lg transition-colors ${
                  mode === m.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === "file" ? (
            <FilePanel />
          ) : (
            <>
              {mode === "hex" && (
                <div className="flex gap-2 mb-6">
                  <button
                    type="button"
                    onClick={() => setHexDir("toBase64")}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      hexDir === "toBase64"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Hex → Base64
                  </button>
                  <button
                    type="button"
                    onClick={() => setHexDir("toHex")}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      hexDir === "toHex"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Base64 → Hex
                  </button>
                </div>
              )}

              <div className="mb-6">
                <div className="block text-sm font-medium text-gray-700 mb-2">
                  {inputLabel}
                </div>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    mode === "jwt"
                      ? "Paste a JWT (header.payload.signature)…"
                      : "Type or paste here…"
                  }
                  className="min-h-[140px] font-mono text-gray-900"
                />
                {(mode === "encode" || mode === "decode") && (
                  <p className="mt-1 text-xs text-gray-500">
                    {input.length} chars · {inputBytes} bytes
                  </p>
                )}
              </div>

              {mode === "encode" && (
                <div className="flex flex-wrap items-center gap-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <Checkbox
                      checked={singleLine}
                      onCheckedChange={(c) => setSingleLine(c === true)}
                    />
                    <span className="text-sm text-gray-700">
                      Single line output
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <Checkbox
                      checked={urlSafe}
                      onCheckedChange={(c) => setUrlSafe(c === true)}
                    />
                    <span className="text-sm text-gray-700">
                      URL-safe (base64url)
                    </span>
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
            </>
          )}
        </div>

        {/* Output card — hidden for file mode (FilePanel renders its own) */}
        {mode !== "file" && mode !== "jwt" && (
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Output</h2>
              {text.output && (
                <button
                  type="button"
                  onClick={() => copy(text.output)}
                  className="px-3 py-1 text-xs bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors"
                >
                  Copy
                </button>
              )}
            </div>
            {text.error ? (
              <p className="text-sm text-red-600">{text.error}</p>
            ) : (
              <>
                <Textarea
                  readOnly
                  value={text.output}
                  placeholder="Result appears here…"
                  className="min-h-[140px] font-mono text-gray-900 bg-gray-50"
                />
                {(mode === "encode" || mode === "decode") && text.output && (
                  <p className="mt-1 text-xs text-gray-500">
                    {text.output.length} chars
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {mode === "jwt" && (
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <p className="text-sm text-amber-600 mb-4">
              Signature is decoded for display only —{" "}
              <strong>not verified</strong>. Verifying a JWT requires the
              signing key, which this tool does not have.
            </p>
            {jwt?.error ? (
              <p className="text-sm text-red-600">{jwt.error}</p>
            ) : jwt?.data ? (
              <div className="space-y-4">
                <JwtField
                  label="Header"
                  value={jwt.data.header}
                  onCopy={copy}
                />
                <JwtField
                  label="Payload"
                  value={jwt.data.payload}
                  onCopy={copy}
                />
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    Signature (raw)
                  </div>
                  <code className="block break-all font-mono text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    {jwt.data.signature}
                  </code>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Decoded header and payload appear here…
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function JwtField({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (v: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-medium text-gray-700">{label}</div>
        <button
          type="button"
          onClick={() => onCopy(value)}
          className="px-3 py-1 text-xs bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors"
        >
          Copy
        </button>
      </div>
      <Textarea
        readOnly
        value={value}
        className="min-h-[100px] font-mono text-gray-900 bg-gray-50"
      />
    </div>
  );
}
