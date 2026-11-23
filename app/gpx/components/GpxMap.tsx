"use client";

import { useEffect, useRef } from "react";
import type { LatLon, ParsedGpx } from "../types";
import { computeBounds } from "../utils";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const LINE_COLOR = "#2563eb";

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
      const { Map: MapLibreMap, Marker, Popup } = await import("maplibre-gl");
      if (cancelled) return;

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
