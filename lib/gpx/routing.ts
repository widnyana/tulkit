import type { LatLon } from "../../app/gpx/types.ts";
import type { MapsTravelMode } from "./mapsLink.ts";

const ROUTING_ENDPOINT = "/api/gpx/routing";
const SNAP_ENDPOINT = "/api/gpx/snap";
const MIN_ROUTE_POINTS = 2;
const MAX_ROUTE_POINTS = 100;

export type SnapReason = "ok" | "no-road" | "unavailable";

export interface RoadSnap {
  point: LatLon | null;
  distance: number | null;
  reason: SnapReason;
}

interface RoutingResponse {
  readonly coordinates?: ReadonlyArray<readonly [number, number]> | null;
}

interface SnapResponse {
  readonly point?: { readonly lat?: number; readonly lon?: number } | null;
  readonly distance?: number | null;
  readonly reason?: unknown;
}

const isInRange = (value: number, min: number, max: number): boolean =>
  Number.isFinite(value) && value >= min && value <= max;

const unavailableSnap = (): RoadSnap => ({
  point: null,
  distance: null,
  reason: "unavailable",
});

export async function fetchRoadRoute(
  points: ReadonlyArray<LatLon>,
  mode: MapsTravelMode,
): Promise<LatLon[] | null> {
  if (
    mode === "transit" ||
    points.length < MIN_ROUTE_POINTS ||
    points.length > MAX_ROUTE_POINTS
  ) {
    return null;
  }

  try {
    const response = await fetch(ROUTING_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        points: points.map((point) => ({ lat: point.lat, lon: point.lon })),
        mode,
      }),
    });
    if (!response.ok) return null;

    const data: RoutingResponse = await response.json();
    const { coordinates } = data;
    if (!Array.isArray(coordinates) || coordinates.length === 0) return null;

    return coordinates.map(([lon, lat]) => ({ lat, lon }));
  } catch {
    return null;
  }
}

export async function snapToRoad(
  point: LatLon,
  mode: MapsTravelMode,
): Promise<RoadSnap> {
  if (
    mode === "transit" ||
    !isInRange(point.lat, -90, 90) ||
    !isInRange(point.lon, -180, 180)
  ) {
    return unavailableSnap();
  }

  try {
    const response = await fetch(SNAP_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: point.lat, lon: point.lon, mode }),
    });
    if (!response.ok) return unavailableSnap();

    const data: SnapResponse = await response.json();
    if (data.reason === "no-road") {
      return { point: null, distance: null, reason: "no-road" };
    }

    const snapped = data.point;
    const { distance } = data;
    if (
      data.reason !== "ok" ||
      !snapped ||
      typeof snapped.lat !== "number" ||
      typeof snapped.lon !== "number" ||
      typeof distance !== "number" ||
      !isInRange(snapped.lat, -90, 90) ||
      !isInRange(snapped.lon, -180, 180) ||
      !Number.isFinite(distance)
    ) {
      return unavailableSnap();
    }

    return {
      point: { lat: snapped.lat, lon: snapped.lon },
      distance,
      reason: "ok",
    };
  } catch {
    return unavailableSnap();
  }
}
