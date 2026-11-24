import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ELEVATION_URL = "https://maps.googleapis.com/maps/api/elevation/json";
const ELEVATION_TIMEOUT_MS = 20000;
const CHUNK_SIZE = 512;
const MIN_POINTS = 1;
const MAX_POINTS = 2000;

interface Coordinate {
  readonly lat: number;
  readonly lon: number;
}

interface GoogleElevationResult {
  readonly elevation?: number;
}

interface GoogleElevationResponse {
  readonly status?: string;
  readonly results?: ReadonlyArray<GoogleElevationResult>;
}

const isInRange = (value: unknown, min: number, max: number): boolean =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max;

const parsePoint = (value: unknown): Coordinate | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const { lat, lon } = value as Record<string, unknown>;
  if (!isInRange(lat, -90, 90) || !isInRange(lon, -180, 180)) return null;
  return { lat: lat as number, lon: lon as number };
};

const errorResponse = (error: string) =>
  NextResponse.json({ error }, { status: 400 });

const unavailableResponse = () => NextResponse.json({ elevations: [] });

const fetchChunk = async (
  points: ReadonlyArray<Coordinate>,
  credential: string,
): Promise<(number | null)[] | null> => {
  const locations = points
    .map((point) => `${point.lat},${point.lon}`)
    .join("|");
  const url = `${ELEVATION_URL}?locations=${encodeURIComponent(locations)}&key=${encodeURIComponent(credential)}`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(ELEVATION_TIMEOUT_MS),
    });
    const data: GoogleElevationResponse = await response.json();

    if (data.status !== "OK" || !Array.isArray(data.results)) {
      return null;
    }
    if (data.results.length !== points.length) {
      return null;
    }

    return data.results.map((result) =>
      typeof result.elevation === "number" && Number.isFinite(result.elevation)
        ? result.elevation
        : null,
    );
  } catch {
    return null;
  }
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body");
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return errorResponse("Request body must be a JSON object");
  }

  const { locations, credential } = body as Record<string, unknown>;

  if (typeof credential !== "string" || credential.trim() === "") {
    return errorResponse("credential must be a non-empty string");
  }
  if (!Array.isArray(locations)) {
    return errorResponse("locations must be an array");
  }
  if (locations.length < MIN_POINTS || locations.length > MAX_POINTS) {
    return errorResponse(
      `locations must contain between ${MIN_POINTS} and ${MAX_POINTS} entries`,
    );
  }

  const parsedPoints: Coordinate[] = [];
  for (const point of locations) {
    const parsed = parsePoint(point);
    if (!parsed) {
      return errorResponse(
        "each location must have a finite lat between -90 and 90 and lon between -180 and 180",
      );
    }
    parsedPoints.push(parsed);
  }

  const elevations: (number | null)[] = [];
  for (let start = 0; start < parsedPoints.length; start += CHUNK_SIZE) {
    const chunk = parsedPoints.slice(start, start + CHUNK_SIZE);
    const values = await fetchChunk(chunk, credential);
    if (!values) return unavailableResponse();
    elevations.push(...values);
  }

  return NextResponse.json({ elevations });
}
