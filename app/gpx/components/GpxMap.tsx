"use client";

import type { Map as MapLibreMap, Popup as MapLibrePopup } from "maplibre-gl";
import { useTheme } from "next-themes";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import type { LatLon, ParsedGpx, RoutePoint } from "../types";
import type {
  DistanceMarks,
  LegendModel,
  LineGroup,
  NamedPointGroup,
  PoiGroup,
} from "../utils";
import {
  buildLegend,
  computeBounds,
  formatDistance,
  safeExternalHref,
} from "../utils";

type MapInstance = MapLibreMap;
type EndpointShape = "circle" | "square";
type SwatchShape = "line" | "circle" | "square";

const STYLE_URL_LIGHT = "https://tiles.openfreemap.org/styles/liberty";
const STYLE_URL_DARK = "https://tiles.openfreemap.org/styles/dark";
const START_COLOR = "#0072b2";
const FINISH_COLOR = "#16181d";
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

function addLineLayer(map: MapInstance, group: LineGroup) {
  const sourceId = `${group.id}-source`;
  map.addSource(sourceId, {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: lineFeatures(group.segments),
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

function addDirectionLayer(map: MapInstance, groups: LineGroup[]) {
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
    context.strokeStyle = "#ffffff";
    context.lineWidth = 4;
    context.lineJoin = "round";
    context.stroke();
    context.fillStyle = "#16181d";
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
      "text-allow-overlap": true,
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
    },
    paint: {
      "text-color": labelPaint.text,
      "text-halo-color": labelPaint.halo,
      "text-halo-width": 1.5,
    },
  });
}

function waypointPopupContent(
  properties: Record<string, unknown>,
): HTMLElement | null {
  const name = typeof properties.name === "string" ? properties.name : "";
  const sym = typeof properties.sym === "string" ? properties.sym : "";
  const desc = typeof properties.desc === "string" ? properties.desc : "";
  const hrefText =
    typeof properties.hrefText === "string" ? properties.hrefText : "";
  const href = safeExternalHref(
    typeof properties.href === "string" ? properties.href : undefined,
  );
  if (!name && !sym && !desc && !href) return null;

  const container = document.createElement("div");
  if (name) {
    const strong = document.createElement("strong");
    strong.textContent = name;
    container.append(strong);
  }
  if (sym) {
    const span = document.createElement("span");
    span.textContent = sym;
    span.className = name
      ? "ml-2 text-muted-foreground"
      : "text-muted-foreground";
    container.append(span);
  }
  if (desc) {
    const paragraph = document.createElement("p");
    paragraph.textContent = desc;
    paragraph.className = "mt-1 whitespace-pre-line text-muted-foreground";
    container.append(paragraph);
  }
  if (href) {
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.textContent = hrefText || href;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.className = "mt-1 inline-block underline";
    container.append(anchor);
  }
  return container;
}

function addWaypointLayers(
  map: MapInstance,
  parsed: ParsedGpx,
  PopupClass: typeof MapLibrePopup,
  labelPaint: LabelPaint,
  poiGroups: PoiGroup[],
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
            color: group?.color ?? "#ffffff",
            ring: group?.ringColor ?? "#16181d",
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
      "circle-stroke-color": ["coalesce", ["get", "ring"], "#16181d"],
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

  map.on("click", WAYPOINT_HIT_LAYER_ID, (event) => {
    const feature = event.features?.[0];
    const content = waypointPopupContent(feature?.properties ?? {});
    if (!content) return;
    new PopupClass().setLngLat(event.lngLat).setDOMContent(content).addTo(map);
  });
  map.on("mouseenter", WAYPOINT_HIT_LAYER_ID, () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", WAYPOINT_HIT_LAYER_ID, () => {
    map.getCanvas().style.cursor = "";
  });
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

function MapLegend({ legend }: { legend: LegendModel }) {
  const { marksVisible, markLabelsVisible, namedVisible, poiVisible } =
    legendVisibility(legend);
  const endpoints = legend.endpoints;
  const hasContent =
    legend.lines.length > 0 ||
    marksVisible ||
    legend.namedPoints !== null ||
    poiVisible ||
    endpoints !== null;
  if (!hasContent) return null;

  return (
    <div
      role="region"
      aria-label="Map legend"
      tabIndex={0}
      className="absolute bottom-3 left-3 z-10 flex max-h-[min(60%,24rem)] max-w-[min(18rem,calc(100%-1.5rem))] flex-col gap-1.5 overflow-y-auto rounded-md border border-border bg-background/95 p-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <p className="font-medium">Legend</p>
      {legend.lines.map((group) => (
        <LegendRow key={group.id}>
          <Swatch
            color={group.color}
            shape="line"
            dashed={group.kind === "route"}
          />
          <span>{group.label}</span>
          <span className="ml-auto tabular-nums text-muted-foreground">
            {formatDistance(group.distanceMeters)}
          </span>
        </LegendRow>
      ))}
      {legend.marks && markLabelsVisible ? (
        <LegendRow>
          <span>
            {legend.marks.count} marks every {legend.marks.stepKm} km
          </span>
        </LegendRow>
      ) : null}
      {legend.marks && !markLabelsVisible ? (
        <LegendRow>
          <span>
            {legend.marks.count} marks, labels hidden above {MARK_LABEL_LIMIT}
          </span>
        </LegendRow>
      ) : null}
      {legend.namedPoints && namedVisible ? (
        <LegendRow>
          <span>{legend.namedPoints.count} named points</span>
        </LegendRow>
      ) : null}
      {legend.namedPoints && !namedVisible ? (
        <LegendRow>
          <span>
            {legend.namedPoints.count} points, labels hidden above{" "}
            {MARK_LABEL_LIMIT}
          </span>
        </LegendRow>
      ) : null}
      {legend.poiGroups.map((group) => (
        <LegendRow key={group.key}>
          <Swatch
            color={group.color}
            shape="circle"
            ringColor={group.ringColor}
          />
          <span>
            {group.label} {group.count}
          </span>
        </LegendRow>
      ))}
      {legend.loop ? (
        <LegendRow>
          <Swatch color={START_COLOR} shape="circle" />
          <span>Start - Finish</span>
        </LegendRow>
      ) : (
        <>
          {endpoints ? (
            <LegendRow>
              <Swatch color={START_COLOR} shape="circle" />
              <span>Start</span>
            </LegendRow>
          ) : null}
          {endpoints ? (
            <LegendRow>
              <Swatch color={FINISH_COLOR} shape="square" />
              <span>Finish</span>
            </LegendRow>
          ) : null}
        </>
      )}
      {legend.lines.length > 0 ? (
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

export function GpxMap({ parsed }: { parsed: ParsedGpx }) {
  const legend = useMemo(() => buildLegend(parsed), [parsed]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const { resolvedTheme } = useTheme();
  const styleUrl = resolvedTheme === "dark" ? STYLE_URL_DARK : STYLE_URL_LIGHT;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setMapFailed(false);

    const labelPaint: LabelPaint =
      styleUrl === STYLE_URL_DARK
        ? { text: "#e8ecf1", halo: "#0f1216" }
        : { text: "#16181d", halo: "#ffffff" };
    const { markLabelsVisible, namedVisible } = legendVisibility(legend);

    let map: MapInstance | undefined;
    let cancelled = false;

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
        const instance = new MapLibreMap({
          container,
          style: styleUrl,
          fadeDuration: 0,
        });
        map = instance;

        instance.setMissingStyleImageResolver((id) => {
          if (instance.hasImage(id)) return;
          instance.addImage(id, new ImageData(1, 1));
        });

        instance.addControl(
          new NavigationControl({ showCompass: true, visualizePitch: false }),
          "top-right",
        );
        instance.addControl(new FullscreenControl(), "top-right");
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
          const marker = new Marker({ element })
            .setLngLat(coordinates)
            .setPopup(new Popup().setText(popupText))
            .addTo(instance);
          element.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            marker.togglePopup();
          });
        };

        instance.on("load", () => {
          if (cancelled) return;

          for (const group of legend.lines) addLineLayer(instance, group);
          addDirectionLayer(instance, legend.lines);
          addWaypointLayers(
            instance,
            parsed,
            Popup,
            labelPaint,
            legend.poiGroups,
          );
          if (markLabelsVisible && legend.marks) {
            addMarkLabelLayer(instance, legend.marks, labelPaint);
          }
          if (namedVisible && legend.namedPoints) {
            addNamedPointLayer(instance, legend.namedPoints, labelPaint);
          }

          const endpoints = legend.endpoints;
          if (endpoints) {
            if (legend.loop) {
              addEndpointMarker(
                [endpoints.start.lon, endpoints.start.lat],
                "Start and finish of a loop",
                "S",
                "Start - Finish",
                "circle",
                START_COLOR,
                `Start - Finish\n${formatCoordinate(endpoints.start)}\nLoop route`,
              );
            } else {
              addEndpointMarker(
                [endpoints.start.lon, endpoints.start.lat],
                "Start of route",
                "S",
                "Start",
                "circle",
                START_COLOR,
                `Start\n${formatCoordinate(endpoints.start)}`,
              );
              addEndpointMarker(
                [endpoints.end.lon, endpoints.end.lat],
                "Finish of route",
                "F",
                "Finish",
                "square",
                FINISH_COLOR,
                `Finish\n${formatCoordinate(endpoints.end)}`,
              );
            }
          } else if (parsed.waypoints.length === 1) {
            const waypoint = parsed.waypoints[0];
            addEndpointMarker(
              [waypoint.lon, waypoint.lat],
              "Waypoint",
              "S",
              "Waypoint",
              "circle",
              START_COLOR,
              `Waypoint\n${formatCoordinate(waypoint)}`,
            );
          }

          fitMapToContent(instance, parsed);
        });
      } catch {
        if (!cancelled) setMapFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [parsed, styleUrl, legend]);

  const endpoints = legend.endpoints;

  return (
    <figure className="space-y-2">
      <div className="relative h-[500px] w-full overflow-hidden rounded-lg border border-border">
        <div ref={containerRef} className="h-full w-full" />
        <MapLegend legend={legend} />
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
