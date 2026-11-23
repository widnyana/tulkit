"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { saveAs } from "file-saver";
import Link from "next/link";
import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useDebouncedCallback } from "use-debounce";
import { type CsvParseResult, parseWaypointCsv } from "@/lib/gpx/csv";
import { waypointsToGpx } from "@/lib/gpx/serialize";
import {
  generateGpxId,
  loadGpxEntry,
  removeGpxEntry,
  saveGpxEntry,
} from "@/lib/gpx/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { GpxMap } from "./components/GpxMap";
import {
  importMapsLink,
  parseGpxText,
  readGpxFile,
  runToResult,
} from "./effects";
import type { MapsWaypoint, ParsedGpx } from "./types";
import { useGpxId } from "./useGpxId";
import { trackSegmentCount } from "./utils";

type ViewState =
  | { kind: "empty" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "success"; parsed: ParsedGpx };

type MapsImportState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "success"; waypoints: MapsWaypoint[] };

type CsvImportState =
  | { kind: "idle" }
  | { kind: "success"; result: CsvParseResult };

export default function GpxViewPage() {
  return (
    <Suspense fallback={null}>
      <GpxViewContent />
    </Suspense>
  );
}

function GpxViewContent() {
  const [rawInput, setRawInput] = useState("");
  const [state, setState] = useState<ViewState>({ kind: "empty" });
  const [mapsUrlInput, setMapsUrlInput] = useState("");
  const [mapsState, setMapsState] = useState<MapsImportState>({
    kind: "idle",
  });
  const [csvInput, setCsvInput] = useState("");
  const [csvState, setCsvState] = useState<CsvImportState>({ kind: "idle" });
  const fileInputId = useId();
  const mapsUrlInputId = useId();

  const [urlId, setUrlId] = useGpxId();
  const currentId = useRef<string | null>(null);
  const appliedUrlId = useRef<string | null>(null);

  const persist = useDebouncedCallback((text: string) => {
    if (text.trim() === "") return;
    if (currentId.current === null) {
      const id = generateGpxId();
      currentId.current = id;
      appliedUrlId.current = id;
      saveGpxEntry(id, text);
      setUrlId(id);
      return;
    }
    saveGpxEntry(currentId.current, text);
  }, 400);

  const parseInto = useCallback(
    (text: string, onParsed?: (text: string) => void) => {
      if (text.trim() === "") {
        setState({ kind: "empty" });
        return;
      }
      void runToResult(parseGpxText(text)).then((result) => {
        setState(
          result.ok
            ? { kind: "success", parsed: result.value }
            : { kind: "error", message: result.message },
        );
        if (result.ok) onParsed?.(text);
      });
    },
    [],
  );

  useEffect(() => {
    if (!urlId || appliedUrlId.current === urlId) return;
    const text = loadGpxEntry(urlId);
    if (text === null) {
      setUrlId(null);
      return;
    }
    appliedUrlId.current = urlId;
    currentId.current = urlId;
    setRawInput(text);
    parseInto(text);
  }, [urlId, setUrlId, parseInto]);

  const handleTextChange = (value: string) => {
    setRawInput(value);
    parseInto(value, persist);
  };

  const handleFileChange = async (file: File) => {
    currentId.current = null;
    appliedUrlId.current = null;
    setState({ kind: "loading" });
    const result = await runToResult(readGpxFile(file));
    if (!result.ok) {
      setState({ kind: "error", message: result.message });
      return;
    }
    setRawInput(result.value.text);
    setState({ kind: "success", parsed: result.value.parsed });
    persist(result.value.text);
  };

  const handleClear = () => {
    if (currentId.current !== null) removeGpxEntry(currentId.current);
    currentId.current = null;
    appliedUrlId.current = null;
    persist.cancel();
    setUrlId(null);
    setRawInput("");
    setState({ kind: "empty" });
  };

  const handleMapsImport = async () => {
    const trimmed = mapsUrlInput.trim();
    if (trimmed === "") return;
    setMapsState({ kind: "loading" });
    const result = await runToResult(importMapsLink(trimmed));
    setMapsState(
      result.ok
        ? { kind: "success", waypoints: result.value }
        : { kind: "error", message: result.message },
    );
  };

  const handleDownloadGpx = () => {
    if (mapsState.kind !== "success") return;
    const gpx = waypointsToGpx(mapsState.waypoints);
    saveAs(new Blob([gpx], { type: "application/gpx+xml" }), "maps-import.gpx");
  };

  const handleCsvChange = (value: string) => {
    setCsvInput(value);
    if (value.trim() === "") {
      setCsvState({ kind: "idle" });
      return;
    }
    setCsvState({ kind: "success", result: parseWaypointCsv(value) });
  };

  const handleDownloadCsvGpx = () => {
    if (csvState.kind !== "success") return;
    const gpx = waypointsToGpx(
      csvState.result.waypoints.map((w) => w.waypoint),
    );
    saveAs(new Blob([gpx], { type: "application/gpx+xml" }), "csv-import.gpx");
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

        <div className="tool-enter mt-10 space-y-4 border-t border-border pt-8">
          <h2 className="text-lg font-semibold text-foreground">
            Import from Google Maps link
          </h2>
          <div className="flex items-center gap-3">
            <label htmlFor={mapsUrlInputId} className="sr-only">
              Google Maps link
            </label>
            <Input
              id={mapsUrlInputId}
              value={mapsUrlInput}
              onChange={(e) => setMapsUrlInput(e.target.value)}
              placeholder="https://maps.app.goo.gl/... or a maps.google.com link"
              className="font-mono text-xs"
            />
            <Button
              type="button"
              onClick={handleMapsImport}
              disabled={
                mapsState.kind === "loading" || mapsUrlInput.trim() === ""
              }
            >
              Import
            </Button>
          </div>

          {mapsState.kind === "loading" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner /> Resolving Maps link...
            </div>
          )}

          {mapsState.kind === "error" && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {mapsState.message}
            </p>
          )}

          {mapsState.kind === "success" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {mapsState.waypoints.length} waypoint
                  {mapsState.waypoints.length === 1 ? "" : "s"} found
                </p>
                <Button type="button" onClick={handleDownloadGpx}>
                  Download GPX
                </Button>
              </div>
              <GpxMap
                parsed={{
                  waypoints: mapsState.waypoints,
                  routes: [],
                  tracks: [],
                  skipped: 0,
                }}
              />
            </div>
          )}
        </div>

        <div className="tool-enter mt-10 space-y-4 border-t border-border pt-8">
          <h2 className="text-lg font-semibold text-foreground">
            Create GPX from a pasted CSV waypoint list
          </h2>
          <Textarea
            value={csvInput}
            onChange={(e) => handleCsvChange(e.target.value)}
            placeholder={
              "Latitude,Longitude,Name,Description\n10.000000,20.000000,Start Point,Trailhead"
            }
            className="min-h-[160px] font-mono text-xs"
          />

          {csvState.kind === "success" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {csvState.result.waypoints.length} waypoint
                  {csvState.result.waypoints.length === 1 ? "" : "s"} parsed
                  {csvState.result.errors.length > 0 &&
                    `, ${csvState.result.errors.length} row${csvState.result.errors.length === 1 ? "" : "s"} failed`}
                </p>
                <Button
                  type="button"
                  onClick={handleDownloadCsvGpx}
                  disabled={csvState.result.waypoints.length === 0}
                >
                  Download GPX
                </Button>
              </div>

              {csvState.result.errors.length > 0 && (
                <ul className="space-y-1 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {csvState.result.errors.map((error) => (
                    <li key={error.row}>{error.message}</li>
                  ))}
                </ul>
              )}

              {csvState.result.waypoints.length > 0 && (
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Row</th>
                        <th className="px-3 py-2 font-medium">Latitude</th>
                        <th className="px-3 py-2 font-medium">Longitude</th>
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvState.result.waypoints.map(({ row, waypoint }) => (
                        <tr key={row} className="border-t border-border">
                          <td className="px-3 py-2">{row}</td>
                          <td className="px-3 py-2">{waypoint.lat}</td>
                          <td className="px-3 py-2">{waypoint.lon}</td>
                          <td className="px-3 py-2">{waypoint.name}</td>
                          <td className="px-3 py-2">{waypoint.desc ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {csvState.result.waypoints.length > 0 && (
                <GpxMap
                  parsed={{
                    waypoints: csvState.result.waypoints.map((w) => w.waypoint),
                    routes: [],
                    tracks: [],
                    skipped: 0,
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
