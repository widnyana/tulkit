import { Effect } from "effect";
import type { LatLon } from "../../app/gpx/types.ts";
import { type GpxRequestError, InvalidPayload } from "./errors.ts";
import {
  DEFAULT_REQUEST_POLICY,
  type RequestPolicy,
  requestJson,
} from "./http.ts";
import { decodeElevations } from "./schemas.ts";

const ELEVATION_ENDPOINT = "/api/gpx/elevation";
const ELEVATION_BATCH_SIZE = 2000;

function requestBatch(
  points: ReadonlyArray<LatLon>,
  policy: RequestPolicy,
): Effect.Effect<(number | null)[], GpxRequestError> {
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
    Effect.flatMap((data) =>
      decodeElevations(data).pipe(
        Effect.flatMap(({ elevations }) => {
          if (!elevations || elevations.length !== points.length) {
            return Effect.fail(
              new InvalidPayload({
                message: "The service returned misaligned elevations.",
              }),
            );
          }

          return Effect.succeed(
            elevations.map((value) =>
              value !== null && Number.isFinite(value) ? value : null,
            ),
          );
        }),
      ),
    ),
  );
}

export function fetchElevations(
  points: ReadonlyArray<LatLon>,
  policy: RequestPolicy = DEFAULT_REQUEST_POLICY,
): Effect.Effect<(number | null)[]> {
  if (points.length === 0) {
    return Effect.succeed([]);
  }

  const batches = Array.from(
    { length: Math.ceil(points.length / ELEVATION_BATCH_SIZE) },
    (_, index) =>
      points.slice(
        index * ELEVATION_BATCH_SIZE,
        (index + 1) * ELEVATION_BATCH_SIZE,
      ),
  );

  return Effect.forEach(
    batches,
    (batch) =>
      requestBatch(batch, policy).pipe(
        Effect.catch(() => Effect.succeed(batch.map(() => null))),
      ),
    { concurrency: 2 },
  ).pipe(Effect.map((results) => results.flat()));
}
