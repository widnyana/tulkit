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
import { fetchElevations } from "@/lib/gpx/elevation";
import { fetchRoadRoute, snapToRoad } from "@/lib/gpx/routing";
import { routeToGpx } from "@/lib/gpx/serialize";
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
import { MissingEntryDialog } from "./components/MissingEntryDialog";
import { MissingEntryPanel } from "./components/MissingEntryPanel";
import { ResultPanel } from "./components/ResultPanel";
import { RoutePlannerMap } from "./components/RoutePlannerMap";
import {
  importMapsLink,
  parseGpxText,
  readGpxFile,
  runToResult,
} from "./effects";
import type { LatLon, MapsWaypoint, ParsedGpx } from "./types";
import {
  CSV_INPUT_KEY,
  gpxStorage,
  MAPS_INPUT_KEY,
  readMapsResult,
  readStoredText,
  type TabValue,
  writeMapsResult,
  writeStoredText,
} from "./tabState";
import { useGpxId } from "./useGpxId";
import { useTabNavigation } from "./useTabNavigation";
import {
  distanceMeters,
  formatDistance,
  pathDistanceMeters,
  waypointsToParsedGpx,
} from "./utils";

const TAB_VALUES = [
  "view",
  "maps",
  "csv",
  "plan",
] as const satisfies readonly TabValue[];

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
const PLAN_NOTICE_TIMEOUT_MS = 3000;
const PLAN_MIN_POINT_GAP_METERS = 10;
const PLAN_MAX_LEG_METERS = 1000 * 1000;
const PLAN_MAX_SNAP_DISTANCE_METERS = 1000;

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
  failed: "A point is not on a road; move it closer to a road to export.",
};

interface PlanNotice {
  title: string;
  description: string;
}

const PLAN_NOTICES = {
  duplicate: {
    title: "Point already placed there.",
    description: "Click somewhere else on the map.",
  },
  tooFar: {
    title: "That point is too far away.",
    description: "Each leg must stay under 1000 km from the previous point.",
  },
  noRoad: {
    title: "No road there.",
    description:
      "The click is more than 1 km from a road. Water and off-road clicks are blocked.",
  },
  unavailable: {
    title: "Could not check that spot.",
    description: "The road service did not answer. Try the click again.",
  },
} as const satisfies Record<string, PlanNotice>;

async function attachElevations(
  points: ReadonlyArray<LatLon>,
): Promise<LatLon[]> {
  const elevations = await fetchElevations(points);
  return points.map((point, index) => {
    const ele = elevations[index];
    return typeof ele === "number" ? { ...point, ele } : point;
  });
}

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
  const [missingId, setMissingId] = useState<string | null>(null);
  const [announcedMissingId, setAnnouncedMissingId] = useState<string | null>(
    null,
  );
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
  const [planNotice, setPlanNotice] = useState<PlanNotice | null>(null);
  const [preparingPlanGpx, setPreparingPlanGpx] = useState(false);
  const [preparingMapsGpx, setPreparingMapsGpx] = useState(false);
  const planPoints = plan.points;
  const snapRequestId = useRef(0);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const draftRestored = useRef(false);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const scrolledResult = useRef<ParsedGpx | null>(null);
  const rawInputId = useId();
  const fileInputId = useId();
  const mapsUrlInputId = useId();
  const csvInputId = useId();
  const planNameId = useId();

  const [urlId, setUrlId] = useGpxId();
  const urlIdOnLoad = useRef<string | null>(urlId);
  useEffect(() => {
    const fromUrl = urlIdOnLoad.current;
    if (fromUrl === null) return;
    if (loadGpxEntry(fromUrl) === null) setMissingId(fromUrl);
  }, []);
  const [tab, setTab] = useTabNavigation();
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
    if (state.kind !== "success") return;
    if (scrolledResult.current === state.parsed) return;
    scrolledResult.current = state.parsed;
    resultsRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [state]);

  useEffect(() => {
    if (!urlId || appliedUrlId.current === urlId) return;
    const text = loadGpxEntry(urlId);
    if (text === null) {
      setMissingId(urlId);
      return;
    }
    setMissingId(null);
    appliedUrlId.current = urlId;
    currentId.current = urlId;
    setRawInput(text);
    parseInto(text);
  }, [urlId, parseInto]);

  const handleDismissMissing = () => {
    setMissingId(null);
    setUrlId(null);
  };

  const handleTextChange = (value: string) => {
    setMissingId(null);
    setRawInput(value);
    parseInto(value, persist);
  };

  const handleFileChange = async (file: File) => {
    currentId.current = null;
    appliedUrlId.current = null;
    setMissingId(null);
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
    setMissingId(null);
    setUrlId(null);
    setRawInput("");
    setState({ kind: "empty" });
  };

  const handleMapsImport = async () => {
    const trimmed = mapsUrlInput.trim();
    if (trimmed === "") return;
    setMapsState({ kind: "loading" });
    const result = await runToResult(importMapsLink(trimmed));
    if (!result.ok) {
      setMapsState({ kind: "error", message: result.message });
      return;
    }
    setMapsState({
      kind: "success",
      waypoints: result.value.waypoints,
      route: result.value.route,
    });
    const store = gpxStorage();
    if (store !== null) {
      writeMapsResult(store, {
        url: trimmed,
        waypoints: result.value.waypoints,
        route: result.value.route,
        savedAt: Date.now(),
      });
    }
  };

  const handleDownloadGpx = async () => {
    if (mapsState.kind !== "success" || preparingMapsGpx) return;
    setPreparingMapsGpx(true);
    try {
      const route = mapsState.route;
      const gpx = routeToGpx({
        waypoints: mapsState.waypoints,
        controlPoints: mapsState.waypoints,
        snappedPath: route === null ? null : await attachElevations(route),
      });
      saveAs(
        new Blob([gpx], { type: "application/gpx+xml" }),
        "maps-import.gpx",
      );
    } finally {
      setPreparingMapsGpx(false);
    }
  };

  const handleCsvChange = useCallback((value: string) => {
    setCsvInput(value);
    if (value.trim() === "") {
      setCsvState({ kind: "idle" });
      return;
    }
    setCsvState({ kind: "success", result: parseWaypointCsv(value) });
  }, []);

  const handleDownloadCsvGpx = () => {
    if (csvState.kind !== "success") return;
    const waypoints = csvState.result.waypoints.map((w) => w.waypoint);
    const gpx = routeToGpx({ waypoints, controlPoints: waypoints });
    saveAs(new Blob([gpx], { type: "application/gpx+xml" }), "csv-import.gpx");
  };

  const inputsRestored = useRef(false);

  useEffect(() => {
    if (inputsRestored.current) return;
    inputsRestored.current = true;
    const store = gpxStorage();
    if (store === null) return;
    const savedMapsInput = readStoredText(store, MAPS_INPUT_KEY);
    setMapsUrlInput(savedMapsInput);
    const savedMapsResult = readMapsResult(store);
    if (savedMapsResult !== null && savedMapsResult.url === savedMapsInput) {
      setMapsState({
        kind: "success",
        waypoints: savedMapsResult.waypoints,
        route: savedMapsResult.route,
      });
    }
    const savedCsv = readStoredText(store, CSV_INPUT_KEY);
    if (savedCsv !== "") handleCsvChange(savedCsv);
  }, [handleCsvChange]);

  useEffect(() => {
    const store = gpxStorage();
    if (store === null) return;
    writeStoredText(store, MAPS_INPUT_KEY, mapsUrlInput);
  }, [mapsUrlInput]);

  useEffect(() => {
    const store = gpxStorage();
    if (store === null) return;
    writeStoredText(store, CSV_INPUT_KEY, csvInput);
  }, [csvInput]);

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

  const dismissPlanNotice = useCallback(() => {
    clearTimeout(noticeTimer.current);
    noticeTimer.current = undefined;
    setPlanNotice(null);
  }, []);

  const showPlanNotice = useCallback((notice: PlanNotice) => {
    clearTimeout(noticeTimer.current);
    setPlanNotice(notice);
    noticeTimer.current = setTimeout(() => {
      noticeTimer.current = undefined;
      setPlanNotice(null);
    }, PLAN_NOTICE_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(noticeTimer.current);
    };
  }, []);

  const handlePlanMapClick = useCallback(
    async (point: LatLon) => {
      const previous = planPoints.at(-1);
      if (previous) {
        const legDistance = distanceMeters(previous, point);
        if (legDistance <= PLAN_MIN_POINT_GAP_METERS) {
          showPlanNotice(PLAN_NOTICES.duplicate);
          return;
        }
        if (legDistance > PLAN_MAX_LEG_METERS) {
          showPlanNotice(PLAN_NOTICES.tooFar);
          return;
        }
      }

      const snap = await snapToRoad(point, planMode);
      if (snap.reason === "no-road") {
        showPlanNotice(PLAN_NOTICES.noRoad);
        return;
      }
      if (
        snap.reason === "unavailable" ||
        snap.point === null ||
        snap.distance === null
      ) {
        showPlanNotice(PLAN_NOTICES.unavailable);
        return;
      }
      if (snap.distance > PLAN_MAX_SNAP_DISTANCE_METERS) {
        showPlanNotice(PLAN_NOTICES.noRoad);
        return;
      }

      dispatchPlan({ type: "add", point: snap.point });
    },
    [planPoints, planMode, showPlanNotice],
  );

  const handlePlanPointMove = useCallback((index: number, point: LatLon) => {
    dispatchPlan({ type: "move", index, point });
  }, []);

  const handleDownloadRouteGpx = async () => {
    if (planPoints.length < 2 || snappedPath === null || preparingPlanGpx) {
      return;
    }
    setPreparingPlanGpx(true);
    try {
      const gpx = routeToGpx({
        name: planName,
        controlPoints: planPoints,
        snappedPath: await attachElevations(snappedPath),
      });
      saveAs(
        new Blob([gpx], { type: "application/gpx+xml" }),
        `${slugifyName(planName) || "route"}.gpx`,
      );
    } finally {
      setPreparingPlanGpx(false);
    }
  };

  return (
    <div className="min-h-screen">
      {missingId !== null && announcedMissingId !== missingId && (
        <MissingEntryDialog
          id={missingId}
          onClose={() => setAnnouncedMissingId(missingId)}
        />
      )}
      <div className="mx-auto px-5 pb-28 pt-10 sm:px-6 sm:pt-14 lg:pb-12">
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
            GPX Viewer & Route Planner
          </h1>
          <p className="mt-2 text-muted-foreground">
            Inspect a GPX file, plan a road route on the map, or turn waypoints
            into a GPX file.
          </p>
          <p className="sr-only">
            Inspect a GPX file, plan a route by clicking on the map, or turn a
            waypoint list into GPX. Paste GPX XML or upload a .gpx file from
            Strava, Garmin, RideWithGPS, or similar software to see its
            metadata, waypoints, routes, and tracks. Paste a Google Maps share
            link or a CSV of latitude/longitude rows to build a file. Planned
            routes snap to roads for driving, cycling, or walking, and exports
            carry elevation. Parsing, planning, and export happen in your
            browser; files never leave your device.
          </p>
        </header>

        <Tabs
          value={tab}
          onValueChange={(value) => {
            const next = TAB_VALUES.find((entry) => entry === value);
            if (next) setTab(next);
          }}
          className="tool-enter mt-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            {TAB_VALUES.map((value) => (
              <TabsTrigger key={value} value={value}>
                {TAB_LABELS[value]}
              </TabsTrigger>
            ))}
          </TabsList>
          <p className="mt-3 text-sm text-muted-foreground">{TAB_HINTS[tab]}</p>

          {missingId !== null && (
            <div className="mt-4">
              <MissingEntryPanel
                id={missingId}
                onDismiss={handleDismissMissing}
              />
            </div>
          )}

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

            {state.kind === "empty" && missingId === null && (
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

            <div ref={resultsRef}>
              {state.kind === "success" && (
                <ResultPanel parsed={state.parsed} />
              )}
            </div>
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
                  <Button
                    type="button"
                    onClick={handleDownloadGpx}
                    disabled={preparingMapsGpx}
                  >
                    {preparingMapsGpx ? "Preparing..." : "Download GPX"}
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
                    disabled={
                      planPoints.length < 2 ||
                      snappedPath === null ||
                      preparingPlanGpx
                    }
                  >
                    {preparingPlanGpx ? "Preparing..." : "Download GPX"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {planNotice !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center p-6">
          <button
            type="button"
            aria-label="Dismiss notice"
            className="absolute inset-0 bg-background/50"
            onClick={dismissPlanNotice}
          />
          <div
            role="alert"
            aria-live="assertive"
            className="relative max-w-xl w-full rounded-lg border-2 border-destructive bg-destructive px-8 py-6 text-center text-destructive-foreground shadow-2xl"
          >
            <p className="text-2xl font-bold">{planNotice.title}</p>
            <p className="mt-2 text-lg">{planNotice.description}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-5"
              onClick={dismissPlanNotice}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
