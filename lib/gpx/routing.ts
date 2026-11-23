import type { LatLon } from "../../app/gpx/types.ts";
import type { MapsTravelMode } from "./mapsLink.ts";

const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1";
const ROUTE_FETCH_TIMEOUT_MS = 6000;

const OSRM_PROFILE: Record<Exclude<MapsTravelMode, "transit">, string> = {
  driving: "driving",
  bicycling: "bike",
  walking: "foot",
};

interface OsrmRoute {
  readonly geometry: { readonly coordinates: ReadonlyArray<[number, number]> };
}

interface OsrmResponse {
  readonly code: string;
  readonly routes?: readonly OsrmRoute[];
}

export async function fetchRoadRoute(
  points: ReadonlyArray<LatLon>,
  mode: MapsTravelMode,
): Promise<LatLon[] | null> {
  if (mode === "transit" || points.length < 2) return null;

  const coordinates = points
    .map((point) => `${point.lon},${point.lat}`)
    .join(";");
  const url = `${OSRM_BASE_URL}/${OSRM_PROFILE[mode]}/${coordinates}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(ROUTE_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const data: OsrmResponse = await response.json();
    const route = data.routes?.[0];
    if (data.code !== "Ok" || !route) return null;

    return route.geometry.coordinates.map(([lon, lat]) => ({ lat, lon }));
  } catch {
    return null;
  }
}
