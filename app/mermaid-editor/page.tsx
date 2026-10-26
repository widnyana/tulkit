"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { downloadPNG, downloadSVG, SAMPLE, STORAGE_KEY } from "./utils";

const ZOOM_MIN = 25;
const ZOOM_MAX = 500;
const ZOOM_STEP = 10;

export default function MermaidEditorPage() {
  const { resolvedTheme } = useTheme();
  const codeId = useId();
  const previewRef = useRef<HTMLDivElement>(null);
  const renderSeq = useRef(0);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const [code, setCode] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Hydrate after mount: reading localStorage during render would mismatch SSR.
  useEffect(() => {
    try {
      setCode(localStorage.getItem(STORAGE_KEY) ?? SAMPLE);
    } catch {
      setCode(SAMPLE);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // storage unavailable (private mode, quota): the editor still works
    }
  }, [code, loaded]);

  // Render is debounced; renderSeq drops results of superseded renders.
  useEffect(() => {
    if (!loaded) return;
    const seq = ++renderSeq.current;
    const timer = setTimeout(async () => {
      const host = previewRef.current;
      if (!host) return;
      if (!code.trim()) {
        host.innerHTML = "";
        setError(null);
        return;
      }
      const id = `mermaid-${seq}`;
      try {
        // Lazy import: mermaid is large and only this route needs it.
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: resolvedTheme === "dark" ? "dark" : "default",
          htmlLabels: false,
          flowchart: { htmlLabels: false },
        });
        const { svg } = await mermaid.render(id, code);
        if (seq !== renderSeq.current) return;
        host.innerHTML = svg;
        const el = host.querySelector("svg");
        if (el) {
          el.style.maxWidth = "100%";
          el.style.height = "auto";
        }
        setError(null);
      } catch (err) {
        // mermaid leaves its scratch node behind on a failed render
        document.getElementById(`d${id}`)?.remove();
        if (seq !== renderSeq.current) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [code, loaded, resolvedTheme]);

  const getSvg = useCallback(
    () => previewRef.current?.querySelector("svg") ?? null,
    [],
  );

  const exportAs = async (kind: "png" | "svg") => {
    const svg = getSvg();
    if (!svg || error) {
      toast.error("No diagram to export");
      return;
    }
    try {
      if (kind === "svg") downloadSVG(svg);
      else await downloadPNG(svg);
      toast.success(`${kind.toUpperCase()} downloaded`);
    } catch {
      toast.error(`Failed to download ${kind.toUpperCase()}`);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied to clipboard");
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const zoomBy = (delta: number) =>
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z + delta)));

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Mermaid Editor
          </h1>
          <p className="text-muted-foreground">
            Write Mermaid syntax, see the diagram live, export as SVG or PNG.
            Everything runs in your browser and is auto-saved locally.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-card rounded-lg shadow-lg p-6 border border-border flex flex-col">
            <label
              htmlFor={codeId}
              className="text-lg font-semibold text-foreground mb-4"
            >
              Mermaid Code
            </label>
            <Textarea
              id={codeId}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              placeholder={SAMPLE}
              className="font-mono text-sm min-h-96 flex-1 resize-y"
            />
            <div className="flex flex-wrap gap-3 mt-4">
              <Button type="button" variant="outline" onClick={copyCode}>
                Copy Code
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCode(SAMPLE)}
              >
                Load Sample
              </Button>
              <a
                href="https://mermaid.js.org/intro/"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto self-center text-sm text-muted-foreground underline hover:text-foreground"
              >
                Mermaid docs
              </a>
            </div>
          </section>

          <section className="bg-card rounded-lg shadow-lg p-6 border border-border flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Preview</h2>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Zoom out"
                  onClick={() => zoomBy(-ZOOM_STEP)}
                >
                  -
                </Button>
                <span
                  className="text-sm text-foreground min-w-12 text-center"
                  aria-live="polite"
                >
                  {zoom}%
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Zoom in"
                  onClick={() => zoomBy(ZOOM_STEP)}
                >
                  +
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setZoom(100);
                    setPan({ x: 0, y: 0 });
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive whitespace-pre-wrap"
              >
                {error}
              </p>
            )}

            <section
              aria-label="Diagram preview"
              className="flex-1 min-h-96 overflow-hidden rounded-md border border-border bg-background cursor-grab active:cursor-grabbing select-none touch-none"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                drag.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
              }}
              onPointerMove={(e) => {
                if (!drag.current) return;
                setPan({
                  x: e.clientX - drag.current.x,
                  y: e.clientY - drag.current.y,
                });
              }}
              onPointerUp={() => {
                drag.current = null;
              }}
            >
              <div
                ref={previewRef}
                className="p-4 origin-top-left"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
                }}
              />
            </section>
            <p className="text-xs text-muted-foreground mt-2">
              Drag to pan, use the buttons to zoom.
            </p>

            <div className="flex flex-wrap gap-3 mt-4">
              <Button type="button" onClick={() => exportAs("png")}>
                Download PNG
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => exportAs("svg")}
              >
                Download SVG
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
