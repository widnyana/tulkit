import { Effect } from "effect";
import type { LatLon } from "../../app/gpx/types.ts";
import {
  type GpxRequestError,
  InvalidInput,
  InvalidPayload,
} from "./errors.ts";
import {
  DEFAULT_REQUEST_POLICY,
  type RequestPolicy,
  requestJson,
} from "./http.ts";
import type { MapsTravelMode } from "./mapsLink.ts";
import { decodeRouting, decodeSnap } from "./schemas.ts";

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

const isInRange = (value: number, min: number, max: number): boolean =>
  Number.isFinite(value) && value >= min && value <= max;

export function fetchRoadRoute(
  points: ReadonlyArray<LatLon>,
  mode: MapsTravelMode,
  policy: RequestPolicy = DEFAULT_REQUEST_POLICY,
): Effect.Effect<LatLon[] | null, GpxRequestError> {
  if (
    mode === "transit" ||
    points.length < MIN_ROUTE_POINTS ||
    points.length > MAX_ROUTE_POINTS
  ) {
    return Effect.succeed(null);
  }

  return requestJson(
    ROUTING_ENDPOINT,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        points: points.map((point) => ({ lat: point.lat, lon: point.lon })),
        mode,
      }),
    },
    policy,
  ).pipe(
    Effect.flatMap((data) =>
      decodeRouting(data).pipe(
        Effect.map(({ coordinates }) =>
          coordinates && coordinates.length > 0
            ? coordinates.map(([lon, lat]) => ({ lat, lon }))
            : null,
        ),
      ),
    ),
  );
}

export function snapToRoad(
  point: LatLon,
  mode: MapsTravelMode,
  policy: RequestPolicy = DEFAULT_REQUEST_POLICY,
): Effect.Effect<RoadSnap, GpxRequestError> {
  if (mode === "transit") {
    return Effect.succeed<RoadSnap>({
      point: null,
      distance: null,
      reason: "unavailable",
    });
  }
  if (!isInRange(point.lat, -90, 90) || !isInRange(point.lon, -180, 180)) {
    return Effect.fail(
      new InvalidInput({ message: "Coordinates are out of range." }),
    );
  }

  return requestJson(
    SNAP_ENDPOINT,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: point.lat, lon: point.lon, mode }),
    },
    policy,
  ).pipe(
    Effect.flatMap((data) =>
      decodeSnap(data).pipe(
        Effect.flatMap((body) => {
          if (body.reason === "no-road") {
            return Effect.succeed<RoadSnap>({
              point: null,
              distance: null,
              reason: "no-road",
            });
          }

          const snapped = body.point;
          const distance = body.distance;
          if (
            body.reason !== "ok" ||
            !snapped ||
            typeof snapped.lat !== "number" ||
            typeof snapped.lon !== "number" ||
            typeof distance !== "number" ||
            !isInRange(snapped.lat, -90, 90) ||
            !isInRange(snapped.lon, -180, 180) ||
            !Number.isFinite(distance)
          ) {
            return Effect.fail(
              new InvalidPayload({
                message: "The service returned an invalid snap.",
              }),
            );
          }

          return Effect.succeed<RoadSnap>({
            point: { lat: snapped.lat, lon: snapped.lon },
            distance,
            reason: "ok",
          });
        }),
      ),
    ),
  );
}
