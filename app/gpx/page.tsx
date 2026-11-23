"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import Link from "next/link";
import { useId, useState } from "react";
import { isParseError, parseGpx } from "@/lib/gpx/parse";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { GpxMap } from "./components/GpxMap";
import type { ParsedGpx } from "./types";
import { trackSegmentCount } from "./utils";

type ViewState =
  | { kind: "empty" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "success"; parsed: ParsedGpx };

export default function GpxViewPage() {
  const [rawInput, setRawInput] = useState("");
  const [state, setState] = useState<ViewState>({ kind: "empty" });
  const fileInputId = useId();

  const parseInto = (text: string) => {
    if (text.trim() === "") {
      setState({ kind: "empty" });
      return;
    }
    const result = parseGpx(text);
    setState(
      isParseError(result)
        ? { kind: "error", message: result.message }
        : { kind: "success", parsed: result },
    );
  };

  const handleTextChange = (value: string) => {
    setRawInput(value);
    parseInto(value);
  };

  const handleFileChange = async (file: File) => {
    setState({ kind: "loading" });
    const text = await file.text();
    setRawInput(text);
    parseInto(text);
  };

  const handleClear = () => {
    setRawInput("");
    setState({ kind: "empty" });
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-5 pb-28 pt-10 sm:px-6 sm:pt-14 lg:pb-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg text-sm text-muted-foreground transition-colors duration-200 ease-soft hover:text-foreground"
        >
          <svg
            className="h-5 w-5"
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

        <header className="hero-enter mb-8 mt-6 max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            GPX Viewer
          </h1>
          <p className="mt-2 text-muted-foreground">
            View any .gpx file's waypoints, routes, and tracks on a map
          </p>
          <p className="sr-only">
            Paste raw GPX XML or upload a .gpx file to see its waypoints,
            routes, and tracks rendered on a map. Supports GPX 1.0 and 1.1 files
            from Strava, Garmin, RideWithGPS, GPSies, ViewRanger, and similar
            GPS software. Useful for inspecting a route before a ride, checking
            a point-of-interest export, or sanity-checking a file before sharing
            it. Parsing and rendering happen entirely in your browser; the file
            never leaves your device.
          </p>
        </header>

        <div className="tool-enter space-y-4">
          <Textarea
            value={rawInput}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Paste GPX XML here..."
            className="min-h-[160px] font-mono text-xs"
          />

          <div className="flex items-center gap-3">
            <label
              htmlFor={fileInputId}
              className="inline-flex h-9 cursor-pointer items-center rounded-md border bg-background px-4 text-sm shadow-xs hover:bg-accent hover:text-accent-foreground"
            >
              Upload .gpx file
            </label>
            <input
              id={fileInputId}
              type="file"
              accept=".gpx,.xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileChange(file);
                e.target.value = "";
              }}
            />
            {rawInput !== "" && (
              <Button type="button" variant="secondary" onClick={handleClear}>
                Clear
              </Button>
            )}
          </div>

          {state.kind === "empty" && (
            <p className="text-sm text-muted-foreground">
              Paste GPX XML above or upload a .gpx file to see it on the map.
            </p>
          )}

          {state.kind === "loading" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner /> Reading file...
            </div>
          )}

          {state.kind === "error" && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {state.message}
            </p>
          )}

          {state.kind === "success" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {state.parsed.waypoints.length} waypoints,{" "}
                {state.parsed.routes.length} routes,{" "}
                {trackSegmentCount(state.parsed)} track segments
                {state.parsed.skipped > 0 &&
                  `, ${state.parsed.skipped} points skipped`}
              </p>
              <GpxMap parsed={state.parsed} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
