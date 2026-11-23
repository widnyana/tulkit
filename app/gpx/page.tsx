"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { saveAs } from "file-saver";
import Link from "next/link";
import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
} from "react";
import { useDebouncedCallback } from "use-debounce";
import { type CsvParseResult, parseWaypointCsv } from "@/lib/gpx/csv";
import { fetchRoadRoute } from "@/lib/gpx/routing";
import { routeToGpx, waypointsToGpx } from "@/lib/gpx/serialize";
import {
  generateGpxId,
  loadGpxEntry,
  removeGpxEntry,
  saveGpxEntry,
} from "@/lib/gpx/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EmptyPanel } from "./components/EmptyPanel";
import { ResultPanel } from "./components/ResultPanel";
import { RoutePlannerMap } from "./components/RoutePlannerMap";
import {
  importMapsLink,
  parseGpxText,
  readGpxFile,
  runToResult,
} from "./effects";
import type { LatLon, MapsWaypoint, ParsedGpx } from "./types";
import { useGpxId } from "./useGpxId";
import { useQueryState } from "./useQueryState";
import {
  formatDistance,
  pathDistanceMeters,
  waypointsToParsedGpx,
} from "./utils";

const TAB_VALUES = ["view", "maps", "csv", "plan"] as const;
type TabValue = (typeof TAB_VALUES)[number];

function isTabValue(value: string): value is TabValue {
  return (TAB_VALUES as readonly string[]).includes(value);
}

const TAB_LABELS: Record<TabValue, string> = {
  view: "View",
  maps: "From Maps",
  csv: "From CSV",
  plan: "Route",
};

const TAB_HINTS: Record<TabValue, string> = {
  view: "Paste GPX XML or upload a .gpx file to inspect it on a map.",
  maps: "Paste a Google Maps share link to pull its waypoints into a GPX file.",
  csv: "Paste latitude/longitude rows to generate a GPX file.",
  plan: "Click the map to build a route, snap it to roads, and export it as GPX.",
};

const PLAN_DRAFT_KEY = "tulkit:gpx:route-draft:v1";
const PLAN_DRAFT_DEBOUNCE_MS = 400;
const PLAN_SNAP_DEBOUNCE_MS = 600;
const PLAN_HISTORY_LIMIT = 50;

const PLAN_MODES = ["driving", "bicycling", "walking"] as const;
type PlanMode = (typeof PLAN_MODES)[number];

const PLAN_MODE_LABELS: Record<PlanMode, string> = {
  driving: "Driving",
  bicycling: "Bicycling",
  walking: "Walking",
};

type SnapStatus = "idle" | "loading" | "ok" | "failed";

const SNAP_STATUS_LABELS: Record<SnapStatus, string> = {
  idle: "Add at least two points to snap to roads.",
  loading: "Snapping to roads...",
  ok: "Snapped to roads.",
  failed: "Could not snap to roads; showing straight lines.",
};

interface PlanDraft {
  name: string;
  mode: PlanMode;
  points: LatLon[];
  snappedPath: LatLon[] | null;
}

interface PlanPointsState {
  points: LatLon[];
  history: LatLon[][];
}

type PlanPointsAction =
  | { type: "add"; point: LatLon }
  | { type: "move"; index: number; point: LatLon }
  | { type: "moveUp"; index: number }
  | { type: "moveDown"; index: number }
  | { type: "remove"; index: number }
  | { type: "clear" }
  | { type: "undo" }
  | { type: "restore"; points: LatLon[] };

function withPlanHistory(
  state: PlanPointsState,
  points: LatLon[],
): PlanPointsState {
  return {
    points,
    history: [...state.history, state.points].slice(-PLAN_HISTORY_LIMIT),
  };
}

function planPointsReducer(
  state: PlanPointsState,
  action: PlanPointsAction,
): PlanPointsState {
  switch (action.type) {
    case "add":
      return withPlanHistory(state, [...state.points, action.point]);
    case "move":
      return withPlanHistory(
        state,
        state.points.map((point, index) =>
          index === action.index ? action.point : point,
        ),
      );
    case "moveUp": {
      if (action.index <= 0 || action.index >= state.points.length)
        return state;
      const points = [...state.points];
      [points[action.index - 1], points[action.index]] = [
        points[action.index],
        points[action.index - 1],
      ];
      return withPlanHistory(state, points);
    }
    case "moveDown": {
      if (action.index < 0 || action.index >= state.points.length - 1) {
        return state;
      }
      const points = [...state.points];
      [points[action.index], points[action.index + 1]] = [
        points[action.index + 1],
        points[action.index],
      ];
      return withPlanHistory(state, points);
    }
    case "remove":
      return withPlanHistory(
        state,
        state.points.filter((_, index) => index !== action.index),
      );
    case "clear":
      if (state.points.length === 0) return state;
      return withPlanHistory(state, []);
    case "undo": {
      const previous = state.history.at(-1);
      if (!previous) return state;
      return { points: previous, history: state.history.slice(0, -1) };
    }
    case "restore":
      return { points: action.points, history: [] };
  }
}

function isPlanMode(value: unknown): value is PlanMode {
  return (
    typeof value === "string" &&
    (PLAN_MODES as readonly string[]).includes(value)
  );
}

function isLatLon(value: unknown): value is LatLon {
  if (typeof value !== "object" || value === null) return false;
  const point = value as { lat?: unknown; lon?: unknown };
  return (
    typeof point.lat === "number" &&
    typeof point.lon === "number" &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lon)
  );
}

function slugifyName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type ViewState =
  | { kind: "empty" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "success"; parsed: ParsedGpx };

type MapsImportState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "success"; waypoints: MapsWaypoint[]; route: LatLon[] | null };

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
  const [plan, dispatchPlan] = useReducer(planPointsReducer, {
    points: [],
    history: [],
  });
  const [planName, setPlanName] = useState("");
  const [planMode, setPlanMode] = useState<PlanMode>("driving");
  const [snappedPath, setSnappedPath] = useState<LatLon[] | null>(null);
  const [snapStatus, setSnapStatus] = useState<SnapStatus>("idle");
  const planPoints = plan.points;
  const snapRequestId = useRef(0);
  const draftRestored = useRef(false);
  const rawInputId = useId();
  const fileInputId = useId();
  const mapsUrlInputId = useId();
  const csvInputId = useId();
  const planNameId = useId();

  const [urlId, setUrlId] = useGpxId();
  const [rawTab, setTab] = useQueryState("tab", "view");
  const tab: TabValue = isTabValue(rawTab) ? rawTab : "view";
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
        ? {
            kind: "success",
            waypoints: result.value.waypoints,
            route: result.value.route,
          }
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

  useEffect(() => {
    if (draftRestored.current) return;
    draftRestored.current = true;
    if (typeof window === "undefined") return;

    let parsed: unknown;
    try {
      const raw = window.localStorage.getItem(PLAN_DRAFT_KEY);
      if (raw === null) return;
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (typeof parsed !== "object" || parsed === null) return;

    const draft = parsed as Partial<PlanDraft>;
    if (typeof draft.name === "string") setPlanName(draft.name);
    if (isPlanMode(draft.mode)) setPlanMode(draft.mode);
    if (Array.isArray(draft.points)) {
      const points = draft.points.filter(isLatLon);
      if (points.length > 0) dispatchPlan({ type: "restore", points });
    }
    if (Array.isArray(draft.snappedPath)) {
      const path = draft.snappedPath.filter(isLatLon);
      if (path.length >= 2) setSnappedPath(path);
    }
  }, []);

  useEffect(() => {
    const requestId = snapRequestId.current + 1;
    snapRequestId.current = requestId;

    if (planPoints.length < 2) {
      setSnappedPath(null);
      setSnapStatus("idle");
      return;
    }

    setSnappedPath(null);
    setSnapStatus("loading");

    const timer = setTimeout(() => {
      void fetchRoadRoute(planPoints, planMode).then((route) => {
        if (snapRequestId.current !== requestId) return;
        setSnappedPath(route);
        setSnapStatus(route === null ? "failed" : "ok");
      });
    }, PLAN_SNAP_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      if (snapRequestId.current === requestId) {
        snapRequestId.current = requestId + 1;
      }
    };
  }, [planPoints, planMode]);

  const persistPlanDraft = useDebouncedCallback((draft: PlanDraft) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PLAN_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      return;
    }
  }, PLAN_DRAFT_DEBOUNCE_MS);

  useEffect(() => {
    persistPlanDraft({
      name: planName,
      mode: planMode,
      points: planPoints,
      snappedPath,
    });
  }, [planName, planMode, planPoints, snappedPath, persistPlanDraft]);

  const handlePlanMapClick = useCallback((point: LatLon) => {
    dispatchPlan({ type: "add", point });
  }, []);

  const handlePlanPointMove = useCallback((index: number, point: LatLon) => {
    dispatchPlan({ type: "move", index, point });
  }, []);

  const handleDownloadRouteGpx = () => {
    if (planPoints.length < 2) return;
    const gpx = routeToGpx({
      name: planName,
      controlPoints: planPoints,
      snappedPath,
    });
    saveAs(
      new Blob([gpx], { type: "application/gpx+xml" }),
      `${slugifyName(planName) || "route"}.gpx`,
    );
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
            View a .gpx file's metadata, waypoints, routes, and tracks on a map
          </p>
          <p className="sr-only">
            Paste raw GPX XML or upload a .gpx file to see its declared
            metadata, waypoints, routes, and tracks rendered on a map. Supports
            GPX 1.0 and 1.1 files from Strava, Garmin, RideWithGPS, GPSies,
            ViewRanger, and similar GPS software. Useful for inspecting a route
            before a ride, checking a point-of-interest export, or
            sanity-checking a file before sharing it. Parsing and rendering
            happen entirely in your browser; the file never leaves your device.
          </p>
        </header>

        <Tabs value={tab} onValueChange={setTab} className="tool-enter mt-6">
          <TabsList className="grid w-full grid-cols-4">
            {TAB_VALUES.map((value) => (
              <TabsTrigger key={value} value={value}>
                {TAB_LABELS[value]}
              </TabsTrigger>
            ))}
          </TabsList>
          <p className="mt-3 text-sm text-muted-foreground">{TAB_HINTS[tab]}</p>

          <TabsContent value="view" className="mt-4 space-y-4">
            <label htmlFor={rawInputId} className="sr-only">
              GPX XML
            </label>
            <Textarea
              id={rawInputId}
              value={rawInput}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Paste GPX XML here..."
              className="min-h-[160px] font-mono text-xs"
            />

            <div className="flex items-center gap-3">
              <label
                htmlFor={fileInputId}
                className="relative inline-flex h-9 cursor-pointer items-center rounded-md border bg-background px-4 text-sm shadow-xs hover:bg-accent hover:text-accent-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring/60 has-[:focus-visible]:outline-offset-2"
              >
                Upload .gpx file
                <input
                  id={fileInputId}
                  type="file"
                  accept=".gpx,.xml"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChange(file);
                    e.target.value = "";
                  }}
                />
              </label>
              {rawInput !== "" && (
                <Button type="button" variant="secondary" onClick={handleClear}>
                  Clear
                </Button>
              )}
            </div>

            {state.kind === "empty" && (
              <EmptyPanel message="Paste GPX XML above or upload a .gpx file to see it on the map." />
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

            {state.kind === "success" && <ResultPanel parsed={state.parsed} />}
          </TabsContent>

          <TabsContent value="maps" className="mt-4 space-y-4">
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

            {mapsState.kind === "idle" && (
              <EmptyPanel message="Paste a Google Maps share link above to pull out its waypoints." />
            )}

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
              <ResultPanel
                actions={
                  <Button type="button" onClick={handleDownloadGpx}>
                    Download GPX
                  </Button>
                }
                parsed={waypointsToParsedGpx(
                  mapsState.waypoints,
                  mapsState.route,
                )}
              />
            )}
          </TabsContent>

          <TabsContent value="csv" className="mt-4 space-y-4">
            <label htmlFor={csvInputId} className="sr-only">
              Waypoint CSV
            </label>
            <Textarea
              id={csvInputId}
              value={csvInput}
              onChange={(e) => handleCsvChange(e.target.value)}
              placeholder={
                "Latitude,Longitude,Name,Description\n10.000000,20.000000,Start Point,Trailhead"
              }
              className="min-h-[160px] font-mono text-xs"
            />

            {csvState.kind === "idle" && (
              <EmptyPanel message="Paste latitude/longitude rows above to generate a GPX file." />
            )}

            {csvState.kind === "success" &&
              (csvState.result.waypoints.length > 0 ? (
                <ResultPanel
                  note={
                    csvState.result.errors.length > 0 &&
                    `${csvState.result.errors.length} row${csvState.result.errors.length === 1 ? "" : "s"} failed`
                  }
                  actions={
                    <Button type="button" onClick={handleDownloadCsvGpx}>
                      Download GPX
                    </Button>
                  }
                  parsed={waypointsToParsedGpx(
                    csvState.result.waypoints.map((w) => w.waypoint),
                  )}
                >
                  {csvState.result.errors.length > 0 && (
                    <ul className="space-y-1 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {csvState.result.errors.map((error) => (
                        <li key={error.row}>{error.message}</li>
                      ))}
                    </ul>
                  )}

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
                          <tr
                            key={row}
                            className={`border-t border-border ${row % 2 === 0 ? "bg-muted/30" : ""}`}
                          >
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
                </ResultPanel>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    0 waypoints parsed. Fix the rows below and nothing will be
                    downloadable until at least one parses.
                  </p>
                  {csvState.result.errors.length > 0 && (
                    <ul className="space-y-1 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {csvState.result.errors.map((error) => (
                        <li key={error.row}>{error.message}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
          </TabsContent>

          <TabsContent value="plan" className="mt-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_20rem]">
              <RoutePlannerMap
                controlPoints={planPoints}
                snappedPath={snappedPath}
                onMapClick={handlePlanMapClick}
                onPointMove={handlePlanPointMove}
              />

              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor={planNameId}
                    className="text-sm font-medium text-foreground"
                  >
                    Route name
                  </label>
                  <Input
                    id={planNameId}
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="Morning loop"
                  />
                </div>

                <div
                  role="group"
                  aria-label="Travel mode"
                  className="flex flex-wrap gap-2"
                >
                  {PLAN_MODES.map((value) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={planMode === value ? "default" : "outline"}
                      aria-pressed={planMode === value}
                      onClick={() => setPlanMode(value)}
                    >
                      {PLAN_MODE_LABELS[value]}
                    </Button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {formatDistance(
                      pathDistanceMeters(snappedPath ?? planPoints),
                    )}
                  </span>
                  <span aria-hidden="true">·</span>
                  {snapStatus === "loading" && <Spinner />}
                  <span>{SNAP_STATUS_LABELS[snapStatus]}</span>
                </div>

                {planPoints.length === 0 ? (
                  <EmptyPanel message="Click the map to drop your first route point." />
                ) : (
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">#</th>
                          <th className="px-3 py-2 font-medium">Latitude</th>
                          <th className="px-3 py-2 font-medium">Longitude</th>
                          <th className="px-3 py-2 text-right font-medium">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {planPoints.map((point, index) => (
                          <tr
                            key={`${point.lat}-${point.lon}`}
                            className={`border-t border-border ${index % 2 === 1 ? "bg-muted/30" : ""}`}
                          >
                            <td className="px-3 py-2">{index + 1}</td>
                            <td className="px-3 py-2 font-mono text-xs">
                              {point.lat.toFixed(5)}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">
                              {point.lon.toFixed(5)}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Move point ${index + 1} up`}
                                  disabled={index === 0}
                                  onClick={() =>
                                    dispatchPlan({ type: "moveUp", index })
                                  }
                                >
                                  ↑
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Move point ${index + 1} down`}
                                  disabled={index === planPoints.length - 1}
                                  onClick={() =>
                                    dispatchPlan({ type: "moveDown", index })
                                  }
                                >
                                  ↓
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Delete point ${index + 1}`}
                                  onClick={() =>
                                    dispatchPlan({ type: "remove", index })
                                  }
                                >
                                  ×
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => dispatchPlan({ type: "undo" })}
                    disabled={plan.history.length === 0}
                  >
                    Undo
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => dispatchPlan({ type: "clear" })}
                    disabled={planPoints.length === 0}
                  >
                    Clear
                  </Button>
                  <Button
                    type="button"
                    className="ml-auto"
                    onClick={handleDownloadRouteGpx}
                    disabled={planPoints.length < 2}
                  >
                    Download GPX
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
