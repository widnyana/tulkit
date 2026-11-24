"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import type {
  GeoJSONSource,
  Map as MapLibreMap,
  Marker as MapLibreMarker,
} from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { useMapStyle } from "@/lib/gpx/mapStyle";
import type { LatLon } from "../types";

type MapInstance = MapLibreMap;
type MarkerConstructor = new (options: {
  element: HTMLElement;
  draggable: boolean;
}) => MapLibreMarker;
type RouteGeoJson = Parameters<GeoJSONSource["setData"]>[0];

const ROUTE_COLOR = "#0072b2";
const ROUTE_SOURCE_ID = "gpx-plan-source";
const ROUTE_LAYER_ID = "gpx-plan-line";
const DASHED_PATTERN = [2, 2];
const SOLID_PATTERN = [1, 0];

function controlBounds(
  points: ReadonlyArray<LatLon>,
): [[number, number], [number, number]] | null {
  if (points.length < 2) return null;
  let minLat = Number.POSITIVE_INFINITY;
  let minLon = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let maxLon = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    minLat = Math.min(minLat, point.lat);
    minLon = Math.min(minLon, point.lon);
    maxLat = Math.max(maxLat, point.lat);
    maxLon = Math.max(maxLon, point.lon);
  }
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
}

function routeGeoJson(
  controlPoints: ReadonlyArray<LatLon>,
  snappedPath: ReadonlyArray<LatLon> | null,
): RouteGeoJson {
  const path =
    snappedPath !== null && snappedPath.length >= 2
      ? snappedPath
      : controlPoints;
  if (path.length < 2) {
    return { type: "FeatureCollection", features: [] };
  }
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: path.map((point) => [point.lon, point.lat]),
    },
  };
}

function applyRouteLayer(
  map: MapInstance,
  controlPoints: ReadonlyArray<LatLon>,
  snappedPath: ReadonlyArray<LatLon> | null,
) {
  const isSnapped = snappedPath !== null && snappedPath.length >= 2;
  const data = routeGeoJson(controlPoints, snappedPath);
  const source = map.getSource(ROUTE_SOURCE_ID) as GeoJSONSource | undefined;

  if (source) {
    void source.setData(data);
  } else {
    map.addSource(ROUTE_SOURCE_ID, { type: "geojson", data });
    map.addLayer({
      id: ROUTE_LAYER_ID,
      type: "line",
      source: ROUTE_SOURCE_ID,
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": ROUTE_COLOR,
        "line-width": 4,
        "line-dasharray": isSnapped ? SOLID_PATTERN : DASHED_PATTERN,
      },
    });
  }

  if (map.getLayer(ROUTE_LAYER_ID)) {
    map.setPaintProperty(
      ROUTE_LAYER_ID,
      "line-dasharray",
      isSnapped ? SOLID_PATTERN : DASHED_PATTERN,
    );
  }
}

function markerElement(label: number): HTMLElement {
  const element = document.createElement("div");
  element.textContent = String(label);
  element.setAttribute("aria-label", `Route point ${label}`);
  element.style.cssText =
    "display:flex;align-items:center;justify-content:center;width:26px;height:26px;box-sizing:border-box;border:2px solid #fff;border-radius:50%;background:#0072b2;box-shadow:0 0 0 1px rgba(22,24,29,.45);color:#fff;font-size:12px;font-weight:700;line-height:1;cursor:grab";
  element.addEventListener("click", (event) => event.stopPropagation());
  return element;
}

function locationMarkerElement(): HTMLElement {
  const element = document.createElement("div");
  element.setAttribute("aria-label", "Selected location");
  element.style.cssText =
    "width:18px;height:18px;box-sizing:border-box;border:3px solid #fff;border-radius:50%;background:#ea580c;box-shadow:0 0 0 1px rgba(22,24,29,.45),0 0 0 6px rgba(234,88,12,.25)";
  element.addEventListener("click", (event) => event.stopPropagation());
  return element;
}

export function RoutePlannerMap({
  controlPoints,
  snappedPath,
  onMapClick,
  onPointMove,
  flyToCenter,
}: {
  controlPoints: ReadonlyArray<LatLon>;
  snappedPath: ReadonlyArray<LatLon> | null;
  onMapClick: (point: LatLon) => void;
  onPointMove: (index: number, point: LatLon) => void;
  flyToCenter?: LatLon | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);
  const locationMarkerRef = useRef<MapLibreMarker | null>(null);
  const markerClassRef = useRef<MarkerConstructor | null>(null);
  const controlPointsRef = useRef<ReadonlyArray<LatLon>>(controlPoints);
  const snappedPathRef = useRef(snappedPath);
  const onMapClickRef = useRef(onMapClick);
  const onPointMoveRef = useRef(onPointMove);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const mapStyle = useMapStyle();
  const mapStyleRef = useRef(mapStyle);

  useEffect(() => {
    controlPointsRef.current = controlPoints;
  }, [controlPoints]);

  useEffect(() => {
    snappedPathRef.current = snappedPath;
  }, [snappedPath]);

  useEffect(() => {
    mapStyleRef.current = mapStyle;
  }, [mapStyle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // diff:false forces a full reload instead of an in-place patch: a diff's
    // behavior (does it fire style.load, does it keep our runtime-added
    // source) depends on how close the two styles are, and was not
    // consistent. The route effect re-adds the source if setStyle dropped
    // it and no-ops if it didn't, so a redundant reload (mount, Strict Mode,
    // a toggle fired before the last one settled) is harmless either way.
    map.setStyle(mapStyle, { diff: false });
    map.once("style.load", () => {
      map.setMissingStyleImageResolver((id) => {
        if (map.hasImage(id)) return;
        map.addImage(id, new ImageData(1, 1));
      });
      applyRouteLayer(map, controlPointsRef.current, snappedPathRef.current);
    });
  }, [mapStyle]);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
    onPointMoveRef.current = onPointMove;
  }, [onMapClick, onPointMove]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setMapFailed(false);
    setMapReady(false);

    let map: MapInstance | undefined;
    let cancelled = false;

    (async () => {
      try {
        const {
          Map: MapLibreMapCtor,
          Marker,
          NavigationControl,
          FullscreenControl,
          ScaleControl,
          config,
        } = await import("maplibre-gl");
        if (cancelled) return;

        config.WORKER_URL = "/maplibre-gl-worker.mjs";
        const instance = new MapLibreMapCtor({
          container,
          style: mapStyleRef.current,
          fadeDuration: 0,
        });
        map = instance;
        mapRef.current = instance;
        markerClassRef.current = Marker;

        instance.setMissingStyleImageResolver((id) => {
          if (instance.hasImage(id)) return;
          instance.addImage(id, new ImageData(1, 1));
        });

        instance.addControl(
          new NavigationControl({ showCompass: true, visualizePitch: false }),
          "top-right",
        );
        instance.addControl(new FullscreenControl(), "top-right");
        instance.addControl(
          new ScaleControl({ unit: "metric", maxWidth: 100 }),
          "bottom-right",
        );

        instance.on("click", (event) => {
          onMapClickRef.current({
            lat: event.lngLat.lat,
            lon: event.lngLat.lng,
          });
        });

        instance.on("load", () => {
          if (cancelled) return;
          const bounds = controlBounds(controlPointsRef.current);
          if (bounds) {
            instance.fitBounds(bounds, {
              padding: { top: 48, bottom: 48, left: 48, right: 48 },
              maxZoom: 14,
              duration: 0,
            });
          }
          setMapReady(true);
        });
      } catch {
        if (!cancelled) setMapFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
      locationMarkerRef.current?.remove();
      locationMarkerRef.current = null;
      mapRef.current = null;
      markerClassRef.current = null;
      map?.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const Marker = markerClassRef.current;
    if (!map || !mapReady || !Marker) return;

    const markers = controlPoints.map((point, index) => {
      const marker = new Marker({
        element: markerElement(index + 1),
        draggable: true,
      })
        .setLngLat([point.lon, point.lat])
        .addTo(map);
      marker.on("dragend", () => {
        const position = marker.getLngLat();
        onPointMoveRef.current(index, {
          lat: position.lat,
          lon: position.lng,
        });
      });
      return marker;
    });
    markersRef.current = markers;

    return () => {
      for (const marker of markers) marker.remove();
      markersRef.current = markersRef.current.filter(
        (marker) => !markers.includes(marker),
      );
    };
  }, [controlPoints, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    applyRouteLayer(map, controlPoints, snappedPath);
  }, [controlPoints, snappedPath, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const Marker = markerClassRef.current;
    if (!map || !mapReady || !flyToCenter || !Marker) return;
    map.flyTo({ center: [flyToCenter.lon, flyToCenter.lat], zoom: 13 });

    locationMarkerRef.current?.remove();
    locationMarkerRef.current = new Marker({
      element: locationMarkerElement(),
      draggable: false,
    })
      .setLngLat([flyToCenter.lon, flyToCenter.lat])
      .addTo(map);
  }, [flyToCenter, mapReady]);

  return (
    <div className="gpx-map-shell relative h-[60dvh] max-h-[420px] min-h-[280px] w-full overflow-hidden rounded-lg border border-border sm:h-[55dvh] sm:max-h-[560px] sm:min-h-[420px] lg:h-[65dvh] lg:max-h-[720px]">
      <div ref={containerRef} className="h-full w-full" />
      {mapFailed ? (
        <p className="absolute inset-0 bg-background/80 p-4 text-sm text-muted-foreground">
          The map could not be drawn in this browser. You can still edit the
          route points in the table.
        </p>
      ) : null}
    </div>
  );
}
