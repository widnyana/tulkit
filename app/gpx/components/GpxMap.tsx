"use client";

import type { Map as MapLibreMap, Popup as MapLibrePopup } from "maplibre-gl";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import type { LatLon, ParsedGpx, RoutePoint } from "../types";
import type {
  DistanceMarks,
  LegendModel,
  LineGroup,
  NamedPointGroup,
  PoiGroup,
} from "../utils";
import { useMapStyle } from "@/lib/gpx/mapStyle";
import {
  buildLegend,
  computeBounds,
  formatDistance,
  safeExternalHref,
} from "../utils";

type MapInstance = MapLibreMap;
type EndpointShape = "circle" | "square";
type SwatchShape = "line" | "circle" | "square";

const TOKEN_FALLBACK = {
  foreground: "#16181d",
  background: "#ffffff",
  ring: "#0072b2",
} as const;
const START_SWATCH = "var(--ring)";
const FINISH_SWATCH = "var(--foreground)";

interface ChartTokens {
  foreground: string;
  background: string;
  ring: string;
}

export function readChartTokens(): ChartTokens {
  const styles = getComputedStyle(document.documentElement);
  const read = (name: keyof typeof TOKEN_FALLBACK) =>
    styles.getPropertyValue(`--${name}`).trim() || TOKEN_FALLBACK[name];
  return {
    foreground: read("foreground"),
    background: read("background"),
    ring: read("ring"),
  };
}
const ARROW_IMAGE_ID = "gpx-direction-arrow";
const DIRECTION_SOURCE_ID = "gpx-direction-source";
const DIRECTION_LAYER_ID = "gpx-direction-layer";
const WAYPOINT_SOURCE_ID = "gpx-waypoints-source";
const WAYPOINT_HIT_LAYER_ID = "gpx-waypoints-hit";
const WAYPOINT_DOT_LAYER_ID = "gpx-waypoints-dot";
const WAYPOINT_LABEL_LAYER_ID = "gpx-waypoints-label";
const MARK_SOURCE_ID = "gpx-marks-source";
const MARK_LABEL_LAYER_ID = "gpx-marks-label";
const NAMED_SOURCE_ID = "gpx-named-source";
const NAMED_LABEL_LAYER_ID = "gpx-named-label";
const MARK_LABEL_LIMIT = 200;
const WAYPOINT_LABEL_LIMIT = 200;
// Mirrors the synthetic "Other" bucket key in utils.poiGroups; waypoints whose
// symbol falls outside the kept groups are drawn as part of that legend row.
const OTHER_POI_GROUP_KEY = "__other";

interface VisibleFeatures {
  lines: Record<string, number>;
  marks: number;
  direction: number;
  poi: Record<string, number>;
}

const EMPTY_VISIBLE: VisibleFeatures = {
  lines: {},
  marks: 0,
  direction: 0,
  poi: {},
};

// The e2e probe reads the live map to query rendered features and project
// labels; only exposed outside production builds. The cast is safe: the key
// is test-only and written nowhere else.
type TestWindow = Window & { __gpxMap?: unknown };

function formatCoordinate(point: LatLon): string {
  return `${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`;
}

function lineFeatures(segments: LatLon[][]) {
  return segments
    .filter((segment) => segment.length >= 2)
    .map((segment) => ({
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: segment.map((point) => [point.lon, point.lat]),
      },
    }));
}

function endpointElement(
  ariaLabel: string,
  letter: string,
  label: string,
  shape: EndpointShape,
  color: string,
): HTMLElement {
  const element = document.createElement("div");
  element.setAttribute("role", "button");
  element.setAttribute("aria-label", `${ariaLabel}, show details`);
  element.tabIndex = 0;
  element.style.cssText =
    "display:flex;align-items:center;gap:6px;font-family:ui-sans-serif,system-ui,sans-serif;white-space:nowrap;cursor:pointer;border-radius:4px";
  element.addEventListener("focus", () => {
    element.style.outline = "2px solid #56b4e9";
    element.style.outlineOffset = "2px";
  });
  element.addEventListener("blur", () => {
    element.style.outline = "none";
  });

  const badge = document.createElement("span");
  badge.textContent = letter;
  badge.style.cssText = `display:flex;align-items:center;justify-content:center;width:22px;height:22px;box-sizing:border-box;border:2px solid #fff;border-radius:${
    shape === "circle" ? "50%" : "2px"
  };background:${color};box-shadow:0 0 0 1px rgba(22,24,29,.45);color:#fff;font-size:11px;font-weight:700;line-height:1`;

  const pill = document.createElement("span");
  pill.textContent = label;
  pill.style.cssText =
    "font-size:11px;font-weight:600;color:#16181d;background:rgba(255,255,255,.94);padding:2px 6px;border-radius:3px;border:1px solid rgba(22,24,29,.18)";

  element.append(badge, pill);
  return element;
}

function fitMapToContent(map: MapInstance, parsed: ParsedGpx): boolean {
  const bounds = computeBounds(parsed);
  if (!bounds) return false;
  map.fitBounds(bounds, {
    padding: { top: 48, bottom: 120, left: 48, right: 48 },
    maxZoom: 14,
    duration: 0,
  });
  return true;
}

class ZoomToContentControl {
  private container: HTMLDivElement | undefined;

  constructor(private readonly onZoom: () => void) {}

  onAdd(): HTMLElement {
    const container = document.createElement("div");
    container.className = "maplibregl-ctrl maplibregl-ctrl-group";

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", "Zoom to fit the route");
    button.addEventListener("click", this.onZoom);

    const icon = document.createElement("span");
    icon.className = "maplibregl-ctrl-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.style.backgroundImage = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 29 29" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round"><path d="M8 6H6a2 2 0 0 0-2 2v2"/><path d="M21 6h2a2 2 0 0 1 2 2v2"/><path d="M8 23H6a2 2 0 0 1-2-2v-2"/><path d="M21 23h2a2 2 0 0 0 2-2v-2"/></svg>',
    )}")`;

    button.appendChild(icon);
    container.appendChild(button);
    this.container = container;
    return container;
  }

  onRemove(): void {
    this.container?.remove();
    this.container = undefined;
  }
}

function addLineLayer(map: MapInstance, group: LineGroup, tokens: ChartTokens) {
  const sourceId = `${group.id}-source`;
  map.addSource(sourceId, {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: lineFeatures(group.segments),
    },
  });
  map.addLayer({
    id: `${group.id}-line-casing`,
    type: "line",
    source: sourceId,
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    paint: {
      "line-color": tokens.background,
      "line-width": 6,
      "line-opacity": 0.9,
    },
  });
  map.addLayer({
    id: `${group.id}-line`,
    type: "line",
    source: sourceId,
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    paint:
      group.kind === "route"
        ? {
            "line-color": group.color,
            "line-width": 4,
            "line-dasharray": [2, 1.5],
          }
        : {
            "line-color": group.color,
            "line-width": 4,
          },
  });
}

function addDirectionLayer(
  map: MapInstance,
  groups: LineGroup[],
  tokens: ChartTokens,
) {
  if (groups.length === 0) return;

  if (!map.hasImage(ARROW_IMAGE_ID)) {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, 32, 32);
    context.beginPath();
    context.moveTo(6, 6);
    context.lineTo(26, 16);
    context.lineTo(6, 26);
    context.closePath();
    context.strokeStyle = tokens.background;
    context.lineWidth = 4;
    context.lineJoin = "round";
    context.stroke();
    context.fillStyle = tokens.foreground;
    context.fill();
    map.addImage(ARROW_IMAGE_ID, context.getImageData(0, 0, 32, 32));
  }

  map.addSource(DIRECTION_SOURCE_ID, {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: groups.flatMap((group) => lineFeatures(group.segments)),
    },
  });
  map.addLayer({
    id: DIRECTION_LAYER_ID,
    type: "symbol",
    source: DIRECTION_SOURCE_ID,
    layout: {
      "symbol-placement": "line",
      "symbol-spacing": 70,
      "icon-image": ARROW_IMAGE_ID,
      "icon-size": 0.55,
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
      "icon-rotation-alignment": "map",
      "icon-padding": 0,
      "symbol-avoid-edges": false,
    },
  });
}

interface LabelPaint {
  text: string;
  halo: string;
}

interface LegendVisibility {
  marksVisible: boolean;
  markLabelsVisible: boolean;
  namedVisible: boolean;
  poiVisible: boolean;
}

function legendVisibility(legend: LegendModel): LegendVisibility {
  return {
    marksVisible: legend.marks !== null,
    markLabelsVisible: (legend.marks?.count ?? 0) <= MARK_LABEL_LIMIT,
    namedVisible:
      legend.namedPoints !== null &&
      legend.namedPoints.count <= MARK_LABEL_LIMIT,
    poiVisible: legend.poiGroups.length > 0,
  };
}

function markLabel(point: RoutePoint, index: number, labels: string[]): string {
  const preview = labels[index];
  if (preview !== undefined) return preview;
  return point.name?.trim() || point.sym?.trim() || "";
}

function poiGroupIndex(groups: PoiGroup[]): Map<string, PoiGroup> {
  const index = new Map<string, PoiGroup>();
  for (const group of groups) index.set(group.key, group);
  return index;
}

function addMarkLabelLayer(
  map: MapInstance,
  marks: DistanceMarks,
  labelPaint: LabelPaint,
) {
  map.addSource(MARK_SOURCE_ID, {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: marks.points.map((point, index) => ({
        type: "Feature" as const,
        properties: { label: markLabel(point, index, marks.labels) },
        geometry: {
          type: "Point" as const,
          coordinates: [point.lon, point.lat],
        },
      })),
    },
  });
  map.addLayer({
    id: MARK_LABEL_LAYER_ID,
    type: "symbol",
    source: MARK_SOURCE_ID,
    layout: {
      "text-field": ["get", "label"],
      "text-font": ["Noto Sans Regular"],
      "text-size": 12,
      "text-anchor": "top",
      "text-offset": [0, 0.9],
      "text-allow-overlap": false,
      "text-ignore-placement": false,
      "text-padding": 4,
    },
    paint: {
      "text-color": labelPaint.text,
      "text-halo-color": labelPaint.halo,
      "text-halo-width": 1.5,
    },
  });
}

function addNamedPointLayer(
  map: MapInstance,
  named: NamedPointGroup,
  labelPaint: LabelPaint,
) {
  map.addSource(NAMED_SOURCE_ID, {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: named.points.map((point) => {
        const name = point.name?.trim();
        const sym = point.sym?.trim();
        return {
          type: "Feature" as const,
          properties: {
            ...(name ? { name } : {}),
            ...(sym ? { sym } : {}),
          },
          geometry: {
            type: "Point" as const,
            coordinates: [point.lon, point.lat],
          },
        };
      }),
    },
  });
  map.addLayer({
    id: NAMED_LABEL_LAYER_ID,
    type: "symbol",
    source: NAMED_SOURCE_ID,
    layout: {
      "text-field": ["coalesce", ["get", "name"], ["get", "sym"], ""],
      "text-font": ["Noto Sans Regular"],
      "text-size": 12,
      "text-anchor": "top",
      "text-offset": [0, 0.9],
      "text-allow-overlap": false,
      "text-ignore-placement": false,
      "text-padding": 4,
    },
    paint: {
      "text-color": labelPaint.text,
      "text-halo-color": labelPaint.halo,
      "text-halo-width": 1.5,
    },
  });
}

function popupContent(options: {
  title: string;
  lines?: string[];
  link?: { href: string; text: string };
}): HTMLDivElement {
  const container = document.createElement("div");
  container.className = "flex max-w-[260px] flex-col gap-0.5 text-xs";

  if (options.title) {
    const strong = document.createElement("strong");
    strong.className = "font-semibold";
    strong.textContent = options.title;
    container.append(strong);
  }

  for (const line of options.lines ?? []) {
    if (!line) continue;
    const span = document.createElement("span");
    span.className = "whitespace-pre-line text-muted-foreground";
    span.textContent = line;
    container.append(span);
  }

  if (options.link) {
    const anchor = document.createElement("a");
    anchor.className = "text-ring underline underline-offset-2";
    anchor.href = options.link.href;
    anchor.textContent = options.link.text;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    container.append(anchor);
  }

  return container;
}

function waypointPopupContent(fields: {
  name: string;
  sym: string;
  desc: string;
  href?: string;
  hrefText: string;
}): HTMLDivElement | null {
  const href = safeExternalHref(fields.href);
  if (!fields.name && !fields.sym && !fields.desc && !href) return null;
  return popupContent({
    title: fields.name,
    lines: [fields.sym, fields.desc],
    link: href ? { href, text: fields.hrefText || href } : undefined,
  });
}

function decoratePopup(popup: MapLibrePopup): MapLibrePopup {
  const apply = () => {
    const element: HTMLElement | undefined = popup.getElement();
    if (!element) return;
    const content = element.querySelector<HTMLElement>(
      ".maplibregl-popup-content",
    );
    if (content) {
      content.style.background = "var(--popover)";
      content.style.color = "var(--popover-foreground)";
      content.style.border = "1px solid var(--border)";
      content.style.borderRadius = "var(--radius-md)";
      content.style.padding = "8px 10px";
    }
    const tip = element.querySelector<HTMLElement>(".maplibregl-popup-tip");
    if (tip) tip.style.visibility = "hidden";
  };
  popup.on("open", apply);
  apply();
  return popup;
}

function addWaypointSourceAndLayers(
  map: MapInstance,
  parsed: ParsedGpx,
  labelPaint: LabelPaint,
  poiGroups: PoiGroup[],
  tokens: ChartTokens,
) {
  if (parsed.waypoints.length === 0) return;

  const groups = poiGroupIndex(poiGroups);

  map.addSource(WAYPOINT_SOURCE_ID, {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: parsed.waypoints.map((waypoint) => {
        const sym = waypoint.sym?.trim() ?? "";
        const key = sym.toLowerCase();
        const group = groups.get(key);
        return {
          type: "Feature" as const,
          properties: {
            name: waypoint.name ?? "",
            desc: waypoint.desc ?? "",
            sym: waypoint.sym ?? "",
            group: group?.key ?? OTHER_POI_GROUP_KEY,
            color:
              group?.color === TOKEN_FALLBACK.background
                ? tokens.background
                : (group?.color ?? tokens.background),
            ring:
              group?.ringColor === TOKEN_FALLBACK.foreground
                ? tokens.foreground
                : (group?.ringColor ?? tokens.foreground),
            href: waypoint.link?.href ?? "",
            hrefText: waypoint.link?.text ?? "",
          },
          geometry: {
            type: "Point" as const,
            coordinates: [waypoint.lon, waypoint.lat],
          },
        };
      }),
    },
  });
  map.addLayer({
    id: WAYPOINT_HIT_LAYER_ID,
    type: "circle",
    source: WAYPOINT_SOURCE_ID,
    paint: {
      "circle-radius": 12,
      "circle-opacity": 0,
    },
  });
  map.addLayer({
    id: WAYPOINT_DOT_LAYER_ID,
    type: "circle",
    source: WAYPOINT_SOURCE_ID,
    paint: {
      "circle-radius": 5,
      "circle-color": ["get", "color"],
      "circle-stroke-color": ["coalesce", ["get", "ring"], tokens.foreground],
      "circle-stroke-width": 2,
    },
  });
  if (parsed.waypoints.length <= WAYPOINT_LABEL_LIMIT) {
    map.addLayer({
      id: WAYPOINT_LABEL_LAYER_ID,
      type: "symbol",
      source: WAYPOINT_SOURCE_ID,
      layout: {
        "text-field": ["coalesce", ["get", "name"], ["get", "sym"], ""],
        "text-font": ["Noto Sans Regular"],
        "text-size": 12,
        "text-anchor": "top",
        "text-offset": [0, 0.9],
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": labelPaint.text,
        "text-halo-color": labelPaint.halo,
        "text-halo-width": 1.5,
      },
    });
  }
}

function attachWaypointInteractions(
  map: MapInstance,
  parsed: ParsedGpx,
  PopupClass: typeof MapLibrePopup,
) {
  if (parsed.waypoints.length === 0) return;

  map.on("click", WAYPOINT_HIT_LAYER_ID, (event) => {
    const properties = event.features?.[0]?.properties ?? {};
    const content = waypointPopupContent({
      name: typeof properties.name === "string" ? properties.name : "",
      sym: typeof properties.sym === "string" ? properties.sym : "",
      desc: typeof properties.desc === "string" ? properties.desc : "",
      href: typeof properties.href === "string" ? properties.href : undefined,
      hrefText:
        typeof properties.hrefText === "string" ? properties.hrefText : "",
    });
    if (!content) return;
    decoratePopup(
      new PopupClass({ focusAfterOpen: false })
        .setLngLat(event.lngLat)
        .setDOMContent(content),
    ).addTo(map);
  });
  map.on("mouseenter", WAYPOINT_HIT_LAYER_ID, () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", WAYPOINT_HIT_LAYER_ID, () => {
    map.getCanvas().style.cursor = "";
  });
}

function applyMapContent(
  map: MapInstance,
  parsed: ParsedGpx,
  legend: LegendModel,
  tokens: ChartTokens,
  labelPaint: LabelPaint,
) {
  const { markLabelsVisible, namedVisible } = legendVisibility(legend);
  for (const group of legend.lines) addLineLayer(map, group, tokens);
  addDirectionLayer(map, legend.lines, tokens);
  addWaypointSourceAndLayers(map, parsed, labelPaint, legend.poiGroups, tokens);
  if (markLabelsVisible && legend.marks) {
    addMarkLabelLayer(map, legend.marks, labelPaint);
  }
  if (namedVisible && legend.namedPoints) {
    addNamedPointLayer(map, legend.namedPoints, labelPaint);
  }
}

function Swatch({
  color,
  shape,
  dashed,
  ringColor,
}: {
  color: string;
  shape: SwatchShape;
  dashed?: boolean;
  ringColor?: string;
}) {
  if (shape === "line") {
    return (
      <span
        aria-hidden="true"
        className="inline-block shrink-0"
        style={{
          width: 14,
          height: 3,
          backgroundColor: dashed ? "transparent" : color,
          backgroundImage: dashed
            ? `repeating-linear-gradient(to right, ${color} 0 4px, transparent 4px 7px)`
            : undefined,
        }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0"
      style={{
        width: 12,
        height: 12,
        backgroundColor: color,
        borderRadius: shape === "circle" ? "50%" : 2,
        boxShadow: ringColor ? `inset 0 0 0 1px ${ringColor}` : undefined,
      }}
    />
  );
}

function LegendRow({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2">{children}</div>;
}

function MapLegend({
  legend,
  visible,
}: {
  legend: LegendModel;
  visible: VisibleFeatures;
}) {
  const { markLabelsVisible } = legendVisibility(legend);
  const endpoints = legend.lines.length === 0 ? null : legend.endpoints;
  const marksCapVisible = legend.marks !== null && !markLabelsVisible;
  const directionRowVisible = visible.direction > 0;
  const hasContent =
    legend.lines.length > 0 ||
    legend.marks !== null ||
    legend.namedPoints !== null ||
    legend.poiGroups.length > 0 ||
    endpoints !== null ||
    directionRowVisible;
  if (!hasContent) return null;

  return (
    <div
      role="region"
      aria-label="Map legend"
      tabIndex={0}
      className="absolute bottom-3 left-3 z-10 flex max-h-[min(45%,18rem)] max-w-[min(18rem,calc(100%-8.5rem))] [overflow-wrap:anywhere] flex-col gap-1.5 overflow-y-auto rounded-md border border-border bg-background/95 p-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <p className="font-medium">Legend</p>
      {legend.lines.map((group) => {
        const offScreen = (visible.lines[group.id] ?? 0) === 0;
        return (
          <LegendRow key={group.id}>
            <Swatch
              color={group.color}
              shape="line"
              dashed={group.kind === "route"}
            />
            <span>
              {group.label}
              {offScreen ? " · off screen" : ""}
            </span>
            <span className="ml-auto tabular-nums text-muted-foreground">
              {formatDistance(group.distanceMeters)}
            </span>
          </LegendRow>
        );
      })}
      {legend.marks && markLabelsVisible ? (
        <LegendRow>
          <span>
            {legend.marks.count} marks every {legend.marks.stepKm} km
            {visible.marks < legend.marks.count
              ? ` · ${visible.marks} in view`
              : ""}
          </span>
        </LegendRow>
      ) : null}
      {legend.marks && marksCapVisible ? (
        <LegendRow>
          <span>
            {legend.marks.count} marks, labels hidden above {MARK_LABEL_LIMIT}
          </span>
        </LegendRow>
      ) : null}
      {legend.namedPoints ? (
        <LegendRow>
          <span>{legend.namedPoints.count} named points</span>
        </LegendRow>
      ) : null}
      {legend.poiGroups.map((group) => {
        const visibleCount = visible.poi[group.key] ?? 0;
        const suffix =
          visibleCount < group.count
            ? visibleCount === 0
              ? " · off screen"
              : ` · ${visibleCount} visible`
            : "";
        return (
          <LegendRow key={group.key}>
            <Swatch
              color={
                group.color === TOKEN_FALLBACK.background
                  ? "var(--background)"
                  : group.color
              }
              shape="circle"
              ringColor={
                group.ringColor === TOKEN_FALLBACK.foreground
                  ? "var(--foreground)"
                  : group.ringColor
              }
            />
            <span>
              {group.label} {group.count}
              {suffix}
            </span>
          </LegendRow>
        );
      })}
      {endpoints ? (
        legend.loop ? (
          <LegendRow>
            <Swatch color={START_SWATCH} shape="circle" />
            <span>Start - Finish</span>
          </LegendRow>
        ) : (
          <>
            <LegendRow>
              <Swatch color={START_SWATCH} shape="circle" />
              <span>Start</span>
            </LegendRow>
            <LegendRow>
              <Swatch color={FINISH_SWATCH} shape="square" />
              <span>Finish</span>
            </LegendRow>
          </>
        )
      ) : null}
      {directionRowVisible ? (
        <LegendRow>
          <svg
            aria-hidden="true"
            className="shrink-0"
            width={12}
            height={12}
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <path d="M6 1 11 11 6 8 1 11Z" />
          </svg>
          <span>Direction of travel</span>
        </LegendRow>
      ) : null}
    </div>
  );
}

export function GpxMap({
  parsed,
  focusIndex,
}: {
  parsed: ParsedGpx;
  focusIndex?: number | null;
}) {
  const legend = useMemo(() => buildLegend(parsed), [parsed]);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const [visible, setVisible] = useState<VisibleFeatures>(EMPTY_VISIBLE);
  const [mapInstance, setMapInstance] = useState<MapInstance | null>(null);
  const activeMapRef = useRef<MapInstance | null>(null);
  const popupClassRef = useRef<typeof MapLibrePopup | null>(null);
  const focusedPopupRef = useRef<MapLibrePopup | null>(null);
  const mapStyle = useMapStyle();
  const pendingStyleRef = useRef(mapStyle);
  const appliedStyleRef = useRef<string | typeof mapStyle | null>(null);
  const styleSwitchInFlightRef = useRef(false);
  const parsedRef = useRef(parsed);
  const legendRef = useRef(legend);

  useEffect(() => {
    parsedRef.current = parsed;
  }, [parsed]);

  useEffect(() => {
    legendRef.current = legend;
  }, [legend]);

  useEffect(() => {
    pendingStyleRef.current = mapStyle;
    const map = activeMapRef.current;
    if (!map || styleSwitchInFlightRef.current) return;
    if (appliedStyleRef.current === mapStyle) return;
    beginStyleSwitch(map);
  }, [mapStyle]);

  function finishStyleSwitch(map: MapInstance, target: typeof mapStyle) {
    appliedStyleRef.current = target;
    if (pendingStyleRef.current !== target) {
      beginStyleSwitch(map);
      return;
    }
    styleSwitchInFlightRef.current = false;
    map.setMissingStyleImageResolver((id) => {
      if (map.hasImage(id)) return;
      map.addImage(id, new ImageData(1, 1));
    });
    const tokens = readChartTokens();
    const labelPaint: LabelPaint = {
      text: tokens.foreground,
      halo: tokens.background,
    };
    applyMapContent(map, parsedRef.current, legendRef.current, tokens, labelPaint);
  }

  function beginStyleSwitch(map: MapInstance) {
    const target = pendingStyleRef.current;
    styleSwitchInFlightRef.current = true;
    map.setStyle(target);
    // A style close enough to apply as a diff (ours: same layers, different
    // paint) patches in place and never fires style.load, so a full reload
    // is the only case that needs the event.
    if (map.isStyleLoaded()) {
      finishStyleSwitch(map, target);
    } else {
      map.once("style.load", () => finishStyleSwitch(map, target));
    }
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setMapFailed(false);
    setVisible(EMPTY_VISIBLE);

    const tokens = readChartTokens();
    const labelPaint: LabelPaint = {
      text: tokens.foreground,
      halo: tokens.background,
    };

    let map: MapInstance | undefined;
    let cancelled = false;
    let measureTimer: number | undefined;

    const handleFullscreenChange = () => {
      map?.resize();
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    (async () => {
      try {
        const {
          Map: MapLibreMap,
          Marker,
          Popup,
          NavigationControl,
          FullscreenControl,
          ScaleControl,
          config,
        } = await import("maplibre-gl");
        if (cancelled) return;

        config.WORKER_URL = "/maplibre-gl-worker.mjs";
        popupClassRef.current = Popup;
        const instance = new MapLibreMap({
          container,
          style: pendingStyleRef.current,
          fadeDuration: 0,
        });
        map = instance;
        activeMapRef.current = instance;
        appliedStyleRef.current = pendingStyleRef.current;
        setMapInstance(instance);
        if (process.env.NODE_ENV !== "production") {
          const testWindow = window as TestWindow;
          testWindow.__gpxMap = instance;
        }

        instance.setMissingStyleImageResolver((id) => {
          if (instance.hasImage(id)) return;
          instance.addImage(id, new ImageData(1, 1));
        });

        instance.addControl(
          new NavigationControl({ showCompass: true, visualizePitch: false }),
          "top-right",
        );
        const frame = frameRef.current;
        instance.addControl(
          new FullscreenControl(frame ? { container: frame } : {}),
          "top-right",
        );
        if (computeBounds(parsed)) {
          instance.addControl(
            new ZoomToContentControl(() => fitMapToContent(instance, parsed)),
            "top-right",
          );
        }
        instance.addControl(
          new ScaleControl({ unit: "metric", maxWidth: 100 }),
          "bottom-right",
        );

        const addEndpointMarker = (
          coordinates: [number, number],
          ariaLabel: string,
          letter: string,
          label: string,
          shape: EndpointShape,
          color: string,
          popupText: string,
        ) => {
          const element = endpointElement(
            ariaLabel,
            letter,
            label,
            shape,
            color,
          );
          const [firstLine = "", ...restLines] = popupText.split("\n");
          const marker = new Marker({ element })
            .setLngLat(coordinates)
            .setPopup(
              decoratePopup(
                new Popup({ focusAfterOpen: false }).setDOMContent(
                  popupContent({ title: firstLine, lines: restLines }),
                ),
              ),
            )
            .addTo(instance);
          element.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            marker.togglePopup();
          });
        };

        instance.on("load", () => {
          if (cancelled) return;

          applyMapContent(instance, parsed, legend, tokens, labelPaint);
          attachWaypointInteractions(instance, parsed, Popup);

          const endpoints = legend.lines.length === 0 ? null : legend.endpoints;
          if (endpoints) {
            if (legend.loop) {
              addEndpointMarker(
                [endpoints.start.lon, endpoints.start.lat],
                "Start and finish of a loop",
                "S",
                "Start - Finish",
                "circle",
                "var(--ring)",
                `Start - Finish\n${formatCoordinate(endpoints.start)}\nLoop route`,
              );
            } else {
              addEndpointMarker(
                [endpoints.start.lon, endpoints.start.lat],
                "Start of route",
                "S",
                "Start",
                "circle",
                "var(--ring)",
                `Start\n${formatCoordinate(endpoints.start)}`,
              );
              addEndpointMarker(
                [endpoints.end.lon, endpoints.end.lat],
                "Finish of route",
                "F",
                "Finish",
                "square",
                "var(--foreground)",
                `Finish\n${formatCoordinate(endpoints.end)}`,
              );
            }
          }

          const countLayer = (id: string): number =>
            instance.getLayer(id) === undefined
              ? 0
              : instance.queryRenderedFeatures({ layers: [id] }).length;

          const measure = () => {
            if (cancelled) return;
            const lines: Record<string, number> = {};
            for (const group of legend.lines) {
              lines[group.id] = countLayer(`${group.id}-line`);
            }
            const poi: Record<string, number> = {};
            if (instance.getLayer(WAYPOINT_DOT_LAYER_ID) !== undefined) {
              const dots = instance.queryRenderedFeatures({
                layers: [WAYPOINT_DOT_LAYER_ID],
              });
              for (const dot of dots) {
                const key = dot.properties?.group;
                if (typeof key !== "string") continue;
                poi[key] = (poi[key] ?? 0) + 1;
              }
            }
            setVisible({
              lines,
              marks: countLayer(MARK_LABEL_LAYER_ID),
              direction: countLayer(DIRECTION_LAYER_ID),
              poi,
            });
          };

          const scheduleMeasure = () => {
            clearTimeout(measureTimer);
            measureTimer = window.setTimeout(() => {
              measureTimer = undefined;
              measure();
            }, 150);
          };

          instance.on("idle", measure);
          instance.on("moveend", scheduleMeasure);
          instance.on("zoomend", scheduleMeasure);

          fitMapToContent(instance, parsed);
        });
      } catch {
        if (!cancelled) setMapFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(measureTimer);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      activeMapRef.current = null;
      popupClassRef.current = null;
      focusedPopupRef.current = null;
      appliedStyleRef.current = null;
      styleSwitchInFlightRef.current = false;
      map?.remove();
      setMapInstance(null);
      if (process.env.NODE_ENV !== "production") {
        const testWindow = window as TestWindow;
        delete testWindow.__gpxMap;
      }
    };
  }, [parsed, legend]);

  useEffect(() => {
    const map = mapInstance;
    if (!map || activeMapRef.current !== map) return;
    if (focusIndex === null || focusIndex === undefined) return;
    const waypoint = parsed.waypoints[focusIndex];
    if (!waypoint) return;

    map.flyTo({
      center: [waypoint.lon, waypoint.lat],
      zoom: Math.max(map.getZoom(), 15),
    });

    const PopupClass = popupClassRef.current;
    if (!PopupClass) return;
    const content = waypointPopupContent({
      name: waypoint.name ?? "",
      sym: waypoint.sym ?? "",
      desc: waypoint.desc ?? "",
      href: waypoint.link?.href,
      hrefText: waypoint.link?.text ?? "",
    });
    if (!content) return;

    focusedPopupRef.current?.remove();
    focusedPopupRef.current = decoratePopup(
      new PopupClass({ focusAfterOpen: false })
        .setLngLat([waypoint.lon, waypoint.lat])
        .setDOMContent(content),
    ).addTo(map);
  }, [focusIndex, mapInstance, parsed]);

  const endpoints = legend.lines.length === 0 ? null : legend.endpoints;

  return (
    <figure className="space-y-2">
      <div
        ref={frameRef}
        className="relative h-[500px] w-full overflow-hidden rounded-lg border border-border [&:fullscreen]:h-screen [&:fullscreen]:w-screen [&:fullscreen]:rounded-none"
      >
        <div ref={containerRef} className="h-full w-full" />
        <MapLegend legend={legend} visible={visible} />
        {mapFailed ? (
          <p className="absolute inset-0 p-4 text-sm text-muted-foreground">
            The map could not be drawn in this browser. The stats above still
            reflect the parsed file.
          </p>
        ) : null}
      </div>
      {endpoints && (
        <figcaption className="text-sm text-muted-foreground">
          Start {formatCoordinate(endpoints.start)} · Finish{" "}
          {formatCoordinate(endpoints.end)}
        </figcaption>
      )}
    </figure>
  );
}
