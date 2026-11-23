"use client";

import type { Map as MapLibreMap, Popup as MapLibrePopup } from "maplibre-gl";
import { useTheme } from "next-themes";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { LatLon, ParsedGpx } from "../types";
import type { LineGroup } from "../utils";
import {
  computeBounds,
  distanceMeters,
  elevationGain,
  formatDistance,
  lineGroups,
  pathEndpoints,
  totalDistanceMeters,
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
const LOOP_DISTANCE_METERS = 25;

function formatCoordinate(point: LatLon): string {
  return `${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`;
}

function isLoopRoute(
  endpoints: { start: LatLon; end: LatLon } | null,
): boolean {
  return (
    endpoints !== null &&
    distanceMeters(endpoints.start, endpoints.end) < LOOP_DISTANCE_METERS
  );
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
    paint: {
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

function addWaypointLayers(
  map: MapInstance,
  parsed: ParsedGpx,
  PopupClass: typeof MapLibrePopup,
) {
  if (parsed.waypoints.length === 0) return;

  map.addSource(WAYPOINT_SOURCE_ID, {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: parsed.waypoints.map((waypoint) => ({
        type: "Feature" as const,
        properties: {
          name: waypoint.name ?? "",
          desc: waypoint.desc ?? "",
        },
        geometry: {
          type: "Point" as const,
          coordinates: [waypoint.lon, waypoint.lat],
        },
      })),
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
      "circle-color": "#ffffff",
      "circle-stroke-color": "#16181d",
      "circle-stroke-width": 2,
    },
  });
  map.addLayer({
    id: WAYPOINT_LABEL_LAYER_ID,
    type: "symbol",
    source: WAYPOINT_SOURCE_ID,
    layout: {
      "text-field": ["coalesce", ["get", "name"], ""],
      "text-font": ["Noto Sans Regular"],
      "text-size": 12,
      "text-anchor": "top",
      "text-offset": [0, 0.9],
      "text-allow-overlap": false,
    },
    paint: {
      "text-color": "#16181d",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.5,
    },
  });

  map.on("click", WAYPOINT_HIT_LAYER_ID, (event) => {
    const feature = event.features?.[0];
    const properties: Record<string, unknown> = feature?.properties ?? {};
    const text = [properties.name, properties.desc]
      .filter((part): part is string => typeof part === "string" && part !== "")
      .join("\n");
    if (text === "") return;
    new PopupClass().setLngLat(event.lngLat).setText(text).addTo(map);
  });
  map.on("mouseenter", WAYPOINT_HIT_LAYER_ID, () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", WAYPOINT_HIT_LAYER_ID, () => {
    map.getCanvas().style.cursor = "";
  });
}

function Swatch({ color, shape }: { color: string; shape: SwatchShape }) {
  if (shape === "line") {
    return (
      <span
        aria-hidden="true"
        className="inline-block shrink-0"
        style={{ width: 14, height: 3, backgroundColor: color }}
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
      }}
    />
  );
}

function LegendRow({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2">{children}</div>;
}

function MapLegend({ parsed }: { parsed: ParsedGpx }) {
  const groups = lineGroups(parsed);
  const endpoints = pathEndpoints(parsed);
  const loop = isLoopRoute(endpoints);

  if (groups.length === 0 && parsed.waypoints.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Map legend"
      className="pointer-events-none absolute bottom-3 left-3 z-10 flex max-w-[min(18rem,calc(100%-1.5rem))] flex-col gap-1.5 rounded-md border border-border bg-background/95 p-3 text-xs"
    >
      <p className="font-medium">Legend</p>
      {groups.map((group) => (
        <LegendRow key={group.id}>
          <Swatch color={group.color} shape="line" />
          <span>{group.label}</span>
          <span className="ml-auto tabular-nums text-muted-foreground">
            {formatDistance(group.distanceMeters)}
          </span>
        </LegendRow>
      ))}
      {loop ? (
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
      {groups.length > 0 ? (
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const { resolvedTheme } = useTheme();
  const styleUrl = resolvedTheme === "dark" ? STYLE_URL_DARK : STYLE_URL_LIGHT;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setMapFailed(false);

    let map: MapInstance | undefined;
    let cancelled = false;

    (async () => {
      try {
        const {
          Map: MapLibreMap,
          Marker,
          Popup,
          NavigationControl,
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

        instance.addControl(
          new NavigationControl({ showCompass: true, visualizePitch: false }),
          "top-right",
        );
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
          const element = endpointElement(ariaLabel, letter, label, shape, color);
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

          const groups = lineGroups(parsed);
          for (const group of groups) addLineLayer(instance, group);
          addDirectionLayer(instance, groups);
          addWaypointLayers(instance, parsed, Popup);

          const endpoints = pathEndpoints(parsed);
          if (endpoints) {
            if (isLoopRoute(endpoints)) {
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

          const bounds = computeBounds(parsed);
          if (bounds) {
            instance.fitBounds(bounds, {
              padding: { top: 48, bottom: 120, left: 48, right: 48 },
              maxZoom: 14,
              duration: 0,
            });
          }
        });
      } catch {
        if (!cancelled) setMapFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [parsed, styleUrl]);

  const groups = lineGroups(parsed);
  const distance = totalDistanceMeters(parsed);
  const gain = elevationGain(parsed);
  const endpoints = pathEndpoints(parsed);
  const summary: string[] = [];
  if (distance > 0) summary.push(formatDistance(distance));
  if (gain !== null && gain > 0) summary.push(`+${gain} m ascent`);
  if (groups.length === 0) {
    summary.push(`${parsed.waypoints.length} waypoints`);
  }
  if (endpoints) {
    summary.push(
      `Start ${formatCoordinate(endpoints.start)} | Finish ${formatCoordinate(endpoints.end)}`,
    );
  }

  return (
    <figure className="space-y-2">
      <div className="relative h-[500px] w-full overflow-hidden rounded-lg border border-border">
        <div ref={containerRef} className="h-full w-full" />
        <MapLegend parsed={parsed} />
        {mapFailed ? (
          <p className="absolute inset-0 p-4 text-sm text-muted-foreground">
            The map could not be drawn in this browser. The route summary below
            still lists the distance and coordinates.
          </p>
        ) : null}
      </div>
      <figcaption className="text-sm text-muted-foreground">
        {summary.join(" | ")}
      </figcaption>
    </figure>
  );
}
