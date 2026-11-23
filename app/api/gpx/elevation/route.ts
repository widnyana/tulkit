import { RequestTimeout, UpstreamFailure } from "@/lib/net/outbound";
import { Duration, Effect } from "effect";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ELEVATION_URL = "https://api.open-meteo.com/v1/elevation";
const ELEVATION_TIMEOUT_MS = 20000;
const ELEVATION_REVALIDATE_SECONDS = 86400;
const CHUNK_SIZE = 100;
const MIN_POINTS = 1;
const MAX_POINTS = 2000;

interface Coordinate {
  readonly lat: number;
  readonly lon: number;
}

interface OpenMeteoElevationResponse {
  readonly elevation?: ReadonlyArray<number | null>;
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
): Promise<(number | null)[] | null> => {
  const latitudes = points.map((point) => point.lat).join(",");
  const longitudes = points.map((point) => point.lon).join(",");
  const url = new URL(ELEVATION_URL);
  url.searchParams.set("latitude", latitudes);
  url.searchParams.set("longitude", longitudes);

  return Effect.runPromise(
    Effect.gen(function* () {
      const response = yield* Effect.tryPromise({
        try: (signal) =>
          fetch(url, {
            next: { revalidate: ELEVATION_REVALIDATE_SECONDS },
            signal,
          }),
        catch: () => new UpstreamFailure({ status: 0 }),
      }).pipe(
        Effect.timeout(Duration.millis(ELEVATION_TIMEOUT_MS)),
        Effect.catchTag("TimeoutError", () =>
          Effect.fail(new RequestTimeout()),
        ),
      );

      if (!response.ok) return null;

      const data = yield* Effect.tryPromise({
        try: () => response.json() as Promise<OpenMeteoElevationResponse>,
        catch: () => new UpstreamFailure({ status: 0 }),
      });

      const elevations = data.elevation;
      if (!Array.isArray(elevations) || elevations.length !== points.length) {
        return null;
      }

      return elevations.map((value) =>
        typeof value === "number" && Number.isFinite(value) ? value : null,
      );
    }).pipe(
      Effect.match({
        onFailure: () => null,
        onSuccess: (value) => value,
      }),
    ),
  );
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

  const { points } = body as Record<string, unknown>;

  if (!Array.isArray(points)) {
    return errorResponse("points must be an array");
  }
  if (points.length < MIN_POINTS || points.length > MAX_POINTS) {
    return errorResponse(
      `points must contain between ${MIN_POINTS} and ${MAX_POINTS} entries`,
    );
  }

  const parsedPoints: Coordinate[] = [];
  for (const point of points) {
    const parsed = parsePoint(point);
    if (!parsed) {
      return errorResponse(
        "each point must have a finite lat between -90 and 90 and lon between -180 and 180",
      );
    }
    parsedPoints.push(parsed);
  }

  const elevations: (number | null)[] = [];
  for (let start = 0; start < parsedPoints.length; start += CHUNK_SIZE) {
    const chunk = parsedPoints.slice(start, start + CHUNK_SIZE);
    const values = await fetchChunk(chunk);
    if (!values) return unavailableResponse();
    elevations.push(...values);
  }

  return NextResponse.json({ elevations });
}
