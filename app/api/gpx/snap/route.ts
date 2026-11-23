import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ROUTING_BASE = "https://routing.openstreetmap.de";
const SNAP_TIMEOUT_MS = 6000;
const USER_AGENT = "tulkit-gpx/1.0 (+https://tulkit.widnyana.web.id)";
const SNAP_RADIUS_METERS = 1000;

const ROAD_MODES = ["driving", "bicycling", "walking"] as const;
type RoadMode = (typeof ROAD_MODES)[number];

const OSRM_INSTANCE: Record<RoadMode, string> = {
  driving: "routed-bike",
  bicycling: "routed-bike",
  walking: "routed-foot",
};

const OSRM_PROFILE: Record<RoadMode, string> = {
  driving: "bike",
  bicycling: "bike",
  walking: "walking",
};

interface OsrmNearestWaypoint {
  readonly location?: [number, number];
  readonly distance?: number;
}

interface OsrmNearestResponse {
  readonly code?: string;
  readonly waypoints?: ReadonlyArray<OsrmNearestWaypoint>;
}

const isRoadMode = (value: unknown): value is RoadMode =>
  typeof value === "string" &&
  (ROAD_MODES as ReadonlyArray<string>).includes(value);

const isInRange = (value: unknown, min: number, max: number): boolean =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max;

const errorResponse = (error: string) =>
  NextResponse.json({ error }, { status: 400 });

const unavailableResponse = () =>
  NextResponse.json({
    point: null,
    distance: null,
    reason: "unavailable" as const,
  });

const noRoadResponse = () =>
  NextResponse.json({
    point: null,
    distance: null,
    reason: "no-road" as const,
  });

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

  const { lat, lon, mode } = body as Record<string, unknown>;

  if (!isInRange(lat, -90, 90)) {
    return errorResponse("lat must be a finite number between -90 and 90");
  }
  if (!isInRange(lon, -180, 180)) {
    return errorResponse("lon must be a finite number between -180 and 180");
  }
  if (!isRoadMode(mode)) {
    return errorResponse(`mode must be one of: ${ROAD_MODES.join(", ")}`);
  }

  const url = `${ROUTING_BASE}/${OSRM_INSTANCE[mode]}/nearest/v1/${OSRM_PROFILE[mode]}/${lon},${lat}?number=1&radiuses=${SNAP_RADIUS_METERS}`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(SNAP_TIMEOUT_MS),
      headers: { "User-Agent": USER_AGENT },
    });
    const data: OsrmNearestResponse | null = await response
      .json()
      .catch(() => null);

    if (data?.code === "NoSegment") return noRoadResponse();
    if (!response.ok || data?.code !== "Ok") return unavailableResponse();

    const waypoint = data.waypoints?.[0];
    if (!waypoint?.location) return unavailableResponse();

    const [snappedLon, snappedLat] = waypoint.location;
    const { distance } = waypoint;
    if (
      !isInRange(snappedLat, -90, 90) ||
      !isInRange(snappedLon, -180, 180) ||
      typeof distance !== "number" ||
      !Number.isFinite(distance)
    ) {
      return unavailableResponse();
    }

    return NextResponse.json({
      point: { lat: snappedLat, lon: snappedLon },
      distance,
      reason: "ok" as const,
    });
  } catch {
    return unavailableResponse();
  }
}
