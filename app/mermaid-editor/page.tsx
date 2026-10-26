"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  downloadPNG,
  downloadSVG,
  highlightMermaid,
  mermaidThemeVariables,
  SAMPLE,
  STORAGE_KEY,
  type TokenKind,
} from "./utils";

const ZOOM_MIN = 25;
const ZOOM_MAX = 500;
const ZOOM_STEP = 10;

const EDITOR_TEXT = "font-mono text-sm leading-5 px-3 py-2 whitespace-pre";

const TOKEN_CLASS: Record<TokenKind, string> = {
  comment: "italic text-slate-500 dark:text-slate-400",
  type: "font-semibold text-violet-700 dark:text-violet-300",
  keyword: "text-blue-700 dark:text-sky-300",
  string: "text-emerald-700 dark:text-emerald-300",
  label: "text-teal-700 dark:text-teal-300",
  arrow: "text-orange-600 dark:text-orange-300",
  hex: "text-pink-600 dark:text-pink-300",
  punct: "text-slate-500 dark:text-slate-400",
};

const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

export default function MermaidEditorPage() {
  const { resolvedTheme } = useTheme();
  const codeId = useId();
  const previewRef = useRef<HTMLDivElement>(null);
  const previewBoxRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const [boxSize, setBoxSize] = useState({ w: 0, h: 0 });
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
          theme: "base",
          themeVariables: mermaidThemeVariables(resolvedTheme === "dark"),
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

  const zoomBy = (delta: number) => setZoom((z) => clampZoom(z + delta));

  useEffect(() => {
    const box = previewBoxRef.current;
    if (!box) return;
    const ro = new ResizeObserver(([entry]) =>
      setBoxSize({
        w: entry.contentRect.width,
        h: entry.contentRect.height,
      }),
    );
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  // Canvas dot-grid backdrop: follows pan and zoom so the diagram feels anchored.
  useEffect(() => {
    const canvas = gridRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(boxSize.w * dpr);
    canvas.height = Math.round(boxSize.h * dpr);
    ctx.scale(dpr, dpr);
    const step = Math.max(8, (24 * zoom) / 100);
    const ox = ((pan.x % step) + step) % step;
    const oy = ((pan.y % step) + step) % step;
    ctx.fillStyle =
      resolvedTheme === "dark"
        ? "rgba(148,163,184,0.28)"
        : "rgba(100,116,139,0.3)";
    for (let x = ox; x < boxSize.w; x += step) {
      for (let y = oy; y < boxSize.h; y += step)
        ctx.fillRect(x - 1, y - 1, 2, 2);
    }
  }, [boxSize, zoom, pan, resolvedTheme]);

  // Only the preview box goes full screen; wheel zoom and drag keep working,
  // Esc exits (so the header buttons need not be shown there).
  const enterFullscreen = async () => {
    try {
      await previewBoxRef.current?.requestFullscreen();
    } catch {
      toast.error("Full screen is not available");
    }
  };

  // Native listener: React's onWheel is passive, so it cannot preventDefault
  // and the page would scroll while zooming. Touchpad pinch arrives as a wheel
  // event with ctrlKey set.
  useEffect(() => {
    const box = previewBoxRef.current;
    if (!box) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const next = clampZoom(
        zoom * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002)),
      );
      const rect = box.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const ratio = next / zoom;
      // keep the content point under the cursor fixed
      setPan({ x: px - (px - pan.x) * ratio, y: py - (py - pan.y) * ratio });
      setZoom(next);
    };
    box.addEventListener("wheel", onWheel, { passive: false });
    return () => box.removeEventListener("wheel", onWheel);
  }, [zoom, pan]);

  return (
    <div className="min-h-screen bg-background p-8">
      <div>
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
            {/* Highlight layer sits under a transparent textarea; both share the
                same font metrics and no-wrap so glyphs line up. */}
            <div className="relative flex-1 min-h-96 rounded-md border border-input bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring">
              <pre
                ref={highlightRef}
                aria-hidden="true"
                className={`${EDITOR_TEXT} absolute inset-0 overflow-hidden pointer-events-none m-0`}
              >
                {highlightMermaid(code).map((t) => (
                  <span
                    key={t.start}
                    className={t.kind ? TOKEN_CLASS[t.kind] : undefined}
                  >
                    {t.text}
                  </span>
                ))}
                {/* The space keeps the HTML parser from dropping a lone leading
                    newline in <pre> (empty code at SSR), which broke hydration. */}
                {" \n"}
              </pre>
              <textarea
                id={codeId}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onScroll={(e) => {
                  const pre = highlightRef.current;
                  if (!pre) return;
                  pre.scrollTop = e.currentTarget.scrollTop;
                  pre.scrollLeft = e.currentTarget.scrollLeft;
                }}
                spellCheck={false}
                wrap="off"
                placeholder={SAMPLE}
                className={`${EDITOR_TEXT} absolute inset-0 w-full h-full resize-none overflow-auto bg-transparent text-transparent caret-foreground placeholder:text-muted-foreground focus-visible:outline-none`}
              />
            </div>
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
                href="https://mermaid.ai/open-source/intro/index.html"
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
                  {Math.round(zoom)}%
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={enterFullscreen}
                >
                  Full screen
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
              ref={previewBoxRef}
              aria-label="Diagram preview"
              className="relative flex-1 min-h-96 overflow-hidden rounded-md border border-border bg-background cursor-grab active:cursor-grabbing select-none touch-none"
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
              <canvas
                ref={gridRef}
                aria-hidden="true"
                className="absolute inset-0 w-full h-full pointer-events-none"
              />
              <div
                ref={previewRef}
                className="relative p-4 origin-top-left"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
                }}
              />
            </section>
            <p className="text-xs text-muted-foreground mt-2">
              Drag to pan, scroll or pinch to zoom. Esc exits full screen.
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
