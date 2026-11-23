import { Effect } from "effect";
import type { LatLon } from "../../app/gpx/types.ts";
import { type GpxRequestError, InvalidPayload } from "./errors.ts";
import {
  DEFAULT_REQUEST_POLICY,
  type RequestPolicy,
  requestJson,
} from "./http.ts";

const ELEVATION_ENDPOINT = "/api/gpx/elevation";
const MAX_ELEVATION_POINTS = 2000;

interface ElevationResponse {
  readonly elevations?: ReadonlyArray<number | null> | null;
}

export function fetchElevations(
  points: ReadonlyArray<LatLon>,
  policy: RequestPolicy = DEFAULT_REQUEST_POLICY,
): Effect.Effect<(number | null)[], GpxRequestError> {
  if (points.length === 0) {
    return Effect.succeed([]);
  }
  if (points.length > MAX_ELEVATION_POINTS) {
    return Effect.succeed(points.map(() => null));
  }

  return requestJson(
    ELEVATION_ENDPOINT,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        points: points.map((point) => ({ lat: point.lat, lon: point.lon })),
      }),
    },
    policy,
  ).pipe(
    Effect.flatMap((data) => {
      const { elevations } = data as ElevationResponse;
      if (!Array.isArray(elevations) || elevations.length !== points.length) {
        return Effect.fail(
          new InvalidPayload({
            message: "The service returned misaligned elevations.",
          }),
        );
      }

      return Effect.succeed(
        elevations.map((value) =>
          typeof value === "number" && Number.isFinite(value) ? value : null,
        ),
      );
    }),
  );
}
