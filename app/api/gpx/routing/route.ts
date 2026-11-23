import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ROUTE_TIMEOUT_MS = 8000;
const USER_AGENT = "tulkit-gpx/1.0 (+https://tulkit.widnyana.web.id)";
const SNAP_RADIUS_METERS = 2000;
const MIN_POINTS = 2;
const MAX_POINTS = 100;

const ROAD_MODES = ["driving", "bicycling", "walking"] as const;
type RoadMode = (typeof ROAD_MODES)[number];

const osrmRouteBase = (mode: RoadMode): string => {
  switch (mode) {
    case "driving":
    case "bicycling":
      return "https://routing.openstreetmap.de/routed-bike/route/v1/bike";
    case "walking":
      return "https://routing.openstreetmap.de/routed-foot/route/v1/walking";
  }
};

interface Coordinate {
  readonly lat: number;
  readonly lon: number;
}

interface OsrmRoute {
  readonly geometry: {
    readonly coordinates: ReadonlyArray<readonly [number, number]>;
  };
}

interface OsrmRouteResponse {
  readonly code?: string;
  readonly routes?: ReadonlyArray<OsrmRoute>;
}

const isRoadMode = (value: unknown): value is RoadMode =>
  typeof value === "string" &&
  (ROAD_MODES as ReadonlyArray<string>).includes(value);

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

const unavailableResponse = () => NextResponse.json({ coordinates: null });

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

  const { points, mode } = body as Record<string, unknown>;

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

  if (!isRoadMode(mode)) {
    return errorResponse(`mode must be one of: ${ROAD_MODES.join(", ")}`);
  }

  const coordinates = parsedPoints
    .map((point) => `${point.lon.toFixed(6)},${point.lat.toFixed(6)}`)
    .join(";");
  const radiuses = parsedPoints.map(() => SNAP_RADIUS_METERS).join(";");
  const url = new URL(
    `${coordinates}?geometries=geojson&radiuses=${radiuses}`,
    `${osrmRouteBase(mode)}/`,
  );

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(ROUTE_TIMEOUT_MS),
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) return unavailableResponse();

    const data: OsrmRouteResponse = await response.json();
    const route = data.routes?.[0];
    if (data.code !== "Ok" || !route) return unavailableResponse();

    const geometry = route.geometry.coordinates;
    if (!Array.isArray(geometry) || geometry.length === 0) {
      return unavailableResponse();
    }

    return NextResponse.json({
      coordinates: geometry.map(([lon, lat]) => [lon, lat]),
    });
  } catch {
    return unavailableResponse();
  }
}
