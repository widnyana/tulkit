"use client";

import { useId, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { base64ToBytes, bytesToBase64 } from "@/lib/base64/base64.ts";

type Dir = "encode" | "decode";

const RAW = { singleLine: true, lineWidth: 0, urlSafe: false };

export function FilePanel() {
  const [dir, setDir] = useState<Dir>("encode");

  // encode
  const [encoded, setEncoded] = useState("");
  const [fileType, setFileType] = useState("");
  const [asDataUri, setAsDataUri] = useState(false);

  // decode
  const [decodeInput, setDecodeInput] = useState("");
  const [fileName, setFileName] = useState("decoded.bin");
  const [error, setError] = useState("");

  const fileId = useId();

  const readFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    setEncoded(bytesToBase64(new Uint8Array(buffer), RAW));
    setFileType(file.type);
  };

  const output = encoded
    ? asDataUri
      ? `data:${fileType || "application/octet-stream"};base64,${encoded}`
      : encoded
    : "";

  const download = () => {
    setError("");
    try {
      // Accept a full data URI by dropping everything up to "base64,".
      const b64 = decodeInput.replace(/^[\s\S]*?base64,/, "");
      const bytes = base64ToBytes(b64);
      const url = URL.createObjectURL(new Blob([bytes as BlobPart]));
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName.trim() || "decoded.bin";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Invalid Base64 input — cannot decode to a file.");
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setDir("encode")}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            dir === "encode"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          File → Base64
        </button>
        <button
          type="button"
          onClick={() => setDir("decode")}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            dir === "decode"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Base64 → File
        </button>
      </div>

      {dir === "encode" ? (
        <div className="space-y-4">
          <label
            htmlFor={fileId}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) readFile(file);
            }}
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 text-gray-500 cursor-pointer hover:border-blue-400 hover:text-gray-700 transition-colors"
          >
            <span className="text-sm">
              Drop a file here, or click to choose
            </span>
            <input
              id={fileId}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) readFile(file);
              }}
            />
          </label>

          {output && (
            <>
              <label className="flex items-center space-x-2 cursor-pointer">
                <Checkbox
                  checked={asDataUri}
                  onCheckedChange={(c) => setAsDataUri(c === true)}
                />
                <span className="text-sm text-gray-700">
                  Output as data URI
                </span>
              </label>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Result ({output.length} chars)
                </span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(output)}
                  className="px-3 py-1 text-xs bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors"
                >
                  Copy
                </button>
              </div>
              <Textarea
                readOnly
                value={output}
                className="min-h-[140px] font-mono text-gray-900 bg-gray-50"
              />
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="block text-sm font-medium text-gray-700 mb-2">
              Base64 to decode
            </div>
            <Textarea
              value={decodeInput}
              onChange={(e) => setDecodeInput(e.target.value)}
              placeholder="Paste Base64 or a data URI…"
              className="min-h-[140px] font-mono text-gray-900"
            />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <div className="block text-sm font-medium text-gray-700 mb-2">
                File name
              </div>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="button"
              onClick={download}
              disabled={decodeInput === ""}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Download
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
