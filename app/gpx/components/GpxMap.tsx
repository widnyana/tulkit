"use client";

import { useEffect, useRef } from "react";
import type { LatLon, ParsedGpx } from "../types";
import { computeBounds, pathEndpoints } from "../utils";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const LINE_COLOR = "#2563eb";
const START_COLOR = "#0072b2";
const FINISH_COLOR = "#16181d";

function endpointElement(
  label: string,
  shape: "circle" | "square",
  color: string,
): HTMLElement {
  const element = document.createElement("div");
  element.setAttribute("role", "img");
  element.setAttribute("aria-label", label);
  element.style.cssText =
    "display:flex;align-items:center;gap:5px;font:600 11px/1 ui-sans-serif,system-ui,sans-serif;color:#16181d;white-space:nowrap";

  const symbol = document.createElement("span");
  symbol.style.cssText = `width:12px;height:12px;border:2px solid #fff;border-radius:${
    shape === "circle" ? "50%" : "2px"
  };background:${color};box-shadow:0 0 0 1px rgba(22,24,29,.35)`;

  const text = document.createElement("span");
  text.textContent = label;
  text.style.cssText =
    "padding:2px 5px;border-radius:3px;background:rgba(255,255,255,.92)";

  element.append(symbol, text);
  return element;
}

function addLine(map: import("maplibre-gl").Map, id: string, points: LatLon[]) {
  if (points.length < 2) return;
  map.addSource(id, {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: points.map((p) => [p.lon, p.lat]),
      },
    },
  });
  map.addLayer({
    id,
    type: "line",
    source: id,
    paint: { "line-color": LINE_COLOR, "line-width": 3 },
  });
}

export function GpxMap({ parsed }: { parsed: ParsedGpx }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let map: import("maplibre-gl").Map | undefined;
    let cancelled = false;

    (async () => {
      const {
        Map: MapLibreMap,
        Marker,
        Popup,
        config,
      } = await import("maplibre-gl");
      if (cancelled) return;

      config.WORKER_URL = "/maplibre-gl-worker.mjs";
      const instance = new MapLibreMap({ container, style: STYLE_URL });
      map = instance;

      instance.on("load", () => {
        if (cancelled) return;

        for (const waypoint of parsed.waypoints) {
          const marker = new Marker().setLngLat([waypoint.lon, waypoint.lat]);
          const text = [waypoint.name, waypoint.desc]
            .filter((part): part is string => Boolean(part))
            .join("\n");
          if (text) marker.setPopup(new Popup().setText(text));
          marker.addTo(instance);
        }

        parsed.routes.forEach((route, i) => {
          addLine(instance, `route-${i}`, route.points);
        });

        parsed.tracks.forEach((track, i) => {
          track.segments.forEach((segment, j) => {
            addLine(instance, `track-${i}-${j}`, segment);
          });
        });

        const endpoints = pathEndpoints(parsed);
        if (endpoints) {
          new Marker({
            element: endpointElement("Start", "circle", START_COLOR),
          })
            .setLngLat([endpoints.start.lon, endpoints.start.lat])
            .addTo(instance);

          const closed =
            endpoints.start.lat === endpoints.end.lat &&
            endpoints.start.lon === endpoints.end.lon;
          if (!closed) {
            new Marker({
              element: endpointElement("Finish", "square", FINISH_COLOR),
            })
              .setLngLat([endpoints.end.lon, endpoints.end.lat])
              .addTo(instance);
          }
        }

        const bounds = computeBounds(parsed);
        if (bounds) instance.fitBounds(bounds, { padding: 40, duration: 0 });
      });
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [parsed]);

  return (
    <div
      ref={containerRef}
      className="h-[500px] w-full rounded-lg border border-border"
    />
  );
}
