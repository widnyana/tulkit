"use client";

import Link from "next/link";
import { useState, useRef, useId, useEffect } from "react";
import { toast, Toaster } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { QRCodeSVG } from "./components/QRCodeSVG";
import { StyleControls } from "./components/StyleControls";
import type { ShapeOptions } from "./types";
import type { GradientType } from "./gradient-utils";
import { downloadSVGAsPNG } from "./utils";

// Quick start templates
const templates = [
  {
    icon: "🌐",
    label: "My Website",
    example: "https://yourwebsite.com",
  },
  {
    icon: "☎️",
    label: "Call Me",
    example: "tel:+1-555-0123",
  },
  {
    icon: "✉️",
    label: "Email Me",
    example: "mailto:hello@example.com",
  },
  {
    icon: "💬",
    label: "Plain Text",
    example: "Any text content you want to share",
  },
];

export default function QRGeneratorPage() {
  const [text, setText] = useState("");
  const [errorLevel, setErrorLevel] = useState<
    "LOW" | "MEDIUM" | "QUARTILE" | "HIGH"
  >("MEDIUM");
  const [filename, setFilename] = useState("qr-code");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showStyling, setShowStyling] = useState(false);
  const [includeWatermark, setIncludeWatermark] = useState(true);

  // Styling options
  const [shapeOptions, setShapeOptions] = useState<ShapeOptions>({
    shape: "rounded",
    eyePatternShape: "rounded",
    gap: 0,
    eyePatternGap: 0,
  });
  const [gradientType, setGradientType] = useState<GradientType>("radial");
  const [colors, setColors] = useState<string[]>(["#000000"]);
  const [logoImage, setLogoImage] = useState<string>("");
  const [logoSize, setLogoSize] = useState<number>(0);
  const [qrSize] = useState(300);

  const svgRef = useRef<SVGSVGElement>(null);
  const textId = useId();
  const filenameId = useId();
  const logoUploadId = useId();

  // Debug: Monitor includeWatermark state changes
  useEffect(() => {
    console.log(
      "[State Update] includeWatermark changed to:",
      includeWatermark,
    );
  }, [includeWatermark]);

  const handleDownload = async () => {
    console.log("[Download] includeWatermark state:", includeWatermark);
    if (svgRef.current) {
      try {
        await downloadSVGAsPNG(svgRef.current, filename || "qr-code", {
          includeWatermark,
          watermarkText: "Generated using https://tulkit.widnyana.web.id",
        });
        toast.success("QR code downloaded successfully!");
      } catch (error) {
        toast.error("Failed to download QR code");
      }
    }
  };

  const handleClear = () => {
    setText("");
    setFilename("qr-code");
    setLogoImage("");
  };

  const handleTemplateClick = (example: string) => {
    setText(example);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoImage(event.target?.result as string);
        if (logoSize === 0) {
          setLogoSize(70); // Default logo size
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const charLimit = 200; // Recommended limit for easy scanning
  const isLong = text.length > charLimit;
  const isVeryLong = text.length > 500;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Toaster position="top-right" />
      <div className="max-w-5xl mx-auto">
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
            QR Code Generator with Styling
          </h1>
          <p className="text-gray-600">
            Create beautiful, scannable QR codes with custom shapes, colors, and
            gradients.
          </p>
        </header>

        {/* Quick Start Templates */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Start Templates
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {templates.map((template) => (
              <button
                key={template.label}
                type="button"
                onClick={() => handleTemplateClick(template.example)}
                className="flex flex-col items-center gap-2 p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <span className="text-2xl">{template.icon}</span>
                <span className="text-sm font-medium text-gray-700">
                  {template.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            What do you want to share?
          </h2>
          <label
            htmlFor={textId}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Type or paste your content here
          </label>
          <textarea
            id={textId}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Examples:&#10;• https://yourwebsite.com&#10;• tel:+1-555-0123&#10;• mailto:hello@example.com&#10;• WiFi password, menu, contact info, or any text!"
            className="w-full h-32 p-4 font-mono text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">{text.length} characters</p>
            {isLong && !isVeryLong && (
              <p className="text-xs text-amber-600">
                Shorter text scans more reliably
              </p>
            )}
            {isVeryLong && (
              <p className="text-xs text-red-600">
                Long text may reduce scan reliability
              </p>
            )}
          </div>
        </div>

        {/* Quality Settings */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Quality Settings
              </h2>
              <p className="text-sm text-gray-500">
                Choose error correction level
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setErrorLevel("LOW")}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                errorLevel === "LOW"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">📱</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Clean Screens</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Perfect for digital displays, social media, websites
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Smallest file size
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setErrorLevel("MEDIUM")}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                errorLevel === "MEDIUM"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">📄</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    Most Uses (Recommended)
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Perfect for printed materials, business cards, flyers
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Works if slightly damaged or dirty
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setErrorLevel("QUARTILE")}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                errorLevel === "QUARTILE"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">🏷️</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    Outdoor/Stickers
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Perfect for stickers, signs, rough surfaces
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Works if scratched, faded, or partially covered
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setErrorLevel("HIGH")}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                errorLevel === "HIGH"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">🏗️</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    Harsh Conditions
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Perfect for construction sites, damaged surfaces
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Works even if 30% is damaged or covered
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Styling Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border border-gray-200">
          <button
            type="button"
            onClick={() => setShowStyling(!showStyling)}
            className="flex items-center justify-between w-full text-left"
          >
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Styling & Customization
              </h2>
              <p className="text-sm text-gray-500">
                Customize shapes, colors, and add logos
              </p>
            </div>
            <span className="text-blue-600 font-medium">
              {showStyling ? "▼ Hide" : "▶ Show"}
            </span>
          </button>

          {showStyling && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <StyleControls
                shapeOptions={shapeOptions}
                onShapeOptionsChange={setShapeOptions}
                gradientType={gradientType}
                onGradientTypeChange={setGradientType}
                colors={colors}
                onColorsChange={setColors}
                logoSize={logoSize}
                onLogoSizeChange={setLogoSize}
              />

              {/* Logo Upload */}
              {logoSize > 0 && (
                <div className="mt-6">
                  <label
                    htmlFor={logoUploadId}
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Upload Logo (optional)
                  </label>
                  <input
                    id={logoUploadId}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />
                  {logoImage && (
                    <div className="mt-2 flex items-center gap-2">
                      <p className="text-sm text-green-600">Logo uploaded</p>
                      <button
                        type="button"
                        onClick={() => setLogoImage("")}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}
              {/* Advanced Settings (Collapsed by default) */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {showAdvanced ? "▼ Hide" : "▶ Show"} Advanced Settings
              </button>

              {showAdvanced && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                  <div>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <Checkbox
                        checked={includeWatermark}
                        onCheckedChange={(checked) => {
                          console.log("[Checkbox] checked value:", checked);
                          console.log(
                            "[Checkbox] converting to boolean:",
                            checked === true,
                          );
                          setIncludeWatermark(checked === true);
                        }}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Include watermark
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      Adds &quot;Generated using
                      https://tulkit.widnyana.web.id&quot; below the QR code
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Preview & Download */}
        {text && (
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Your QR Code is Ready!
              </h2>
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                Start Over
              </button>
            </div>

            <div className="flex justify-center p-8 bg-gray-50 border border-gray-200 rounded-lg mb-6">
              <QRCodeSVG
                ref={svgRef}
                value={text}
                size={qrSize}
                errorLevel={errorLevel}
                shapeOptions={shapeOptions}
                gradientType={gradientType}
                colors={colors}
                logoImage={logoImage}
                logoSize={logoSize}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-900 mb-2">Next steps</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Download using the button below</li>
                <li>Test by scanning with your phone</li>
                <li>Use anywhere - print, email, or share online</li>
              </ol>
            </div>

            <div className="mb-4">
              <label
                htmlFor={filenameId}
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Name your file (optional)
              </label>
              <input
                id={filenameId}
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="qr-code"
                className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              type="button"
              onClick={handleDownload}
              className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors text-lg"
            >
              Download QR Code
            </button>

            {includeWatermark && (
              <p className="text-xs text-gray-500 mt-4 text-center">
                Includes small text: &quot;Generated using
                https://tulkit.widnyana.web.id&quot;
              </p>
            )}
          </div>
        )}

        {/* Empty State */}
        {!text && (
          <div className="bg-white rounded-lg shadow-lg p-12 border border-gray-200 text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
            <p className="text-gray-600 mb-2 text-lg font-medium">
              Pick a template above or type your own content
            </p>
            <p className="text-sm text-gray-500">
              Works with websites, phone numbers, emails, and plain text
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
