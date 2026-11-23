import type { LatLon } from "../../app/gpx/types.ts";

const ELEVATION_ENDPOINT = "/api/gpx/elevation";
const MAX_ELEVATION_POINTS = 2000;

interface ElevationResponse {
  readonly elevations?: ReadonlyArray<number | null> | null;
}

export async function fetchElevations(
  points: ReadonlyArray<LatLon>,
): Promise<(number | null)[]> {
  const unavailable = points.map(() => null);
  if (points.length === 0 || points.length > MAX_ELEVATION_POINTS) {
    return unavailable;
  }

  try {
    const response = await fetch(ELEVATION_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        points: points.map((point) => ({ lat: point.lat, lon: point.lon })),
      }),
    });
    if (!response.ok) return unavailable;

    const data: ElevationResponse = await response.json();
    const { elevations } = data;
    if (!Array.isArray(elevations) || elevations.length !== points.length) {
      return unavailable;
    }

    return elevations.map((value) =>
      typeof value === "number" && Number.isFinite(value) ? value : null,
    );
  } catch {
    return unavailable;
  }
}
