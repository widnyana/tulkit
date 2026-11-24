import { Effect } from "effect";
import type { LatLon, ParsedGpx } from "../../app/gpx/types.ts";
import {
  accumulateGain,
  distanceMeters,
  lineGroups,
  totalDistanceMeters,
} from "../../app/gpx/utils.ts";
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
import { decodeElevations } from "./schemas.ts";

export type ElevationProvider = "opentopography" | "google";

// A route's gain doesn't need per-meter resolution, so sample roughly every
// 100m and let the step grow for longer routes to keep near this many
// requests total (approximate, not an exact cutoff).
const SAMPLE_STEP_METERS = 100;
const MAX_SAMPLE_POINTS = 500;

const OPENTOPOGRAPHY_ENDPOINT =
  "https://portal.opentopography.org/API/v1/elevation";
const OPENTOPOGRAPHY_DATASET = "SRTMGL1";
const OPENTOPOGRAPHY_CONCURRENCY = 2;

const GOOGLE_PROXY_ENDPOINT = "/api/gpx/elevation-estimate";
const GOOGLE_CHUNK_SIZE = 512;

function downsampleSegment(
  segment: ReadonlyArray<LatLon>,
  stepMeters: number,
): LatLon[] {
  if (segment.length <= 2) return [...segment];

  const sampled: LatLon[] = [segment[0]];
  let accumulated = 0;
  for (let index = 1; index < segment.length; index++) {
    accumulated += distanceMeters(segment[index - 1], segment[index]);
    const isLast = index === segment.length - 1;
    if (accumulated >= stepMeters || isLast) {
      sampled.push(segment[index]);
      accumulated = 0;
    }
  }
  return sampled;
}

function buildSampleSegments(parsed: ParsedGpx): LatLon[][] {
  const segments: LatLon[][] = [];
  for (const group of lineGroups(parsed)) {
    for (const segment of group.segments) {
      if (segment.length > 0) segments.push(segment);
    }
  }
  if (segments.length === 0) return [];

  const totalDistance = totalDistanceMeters(parsed);
  const stepMeters = Math.max(
    SAMPLE_STEP_METERS,
    totalDistance / MAX_SAMPLE_POINTS,
  );
  return segments.map((segment) => downsampleSegment(segment, stepMeters));
}

interface OpenTopographyResponse {
  readonly Status?: string;
  readonly Elevation?: number;
}

function requestOpenTopographyPoint(
  point: LatLon,
  credential: string,
  policy: RequestPolicy,
): Effect.Effect<number | null, GpxRequestError> {
  const url = new URL(OPENTOPOGRAPHY_ENDPOINT);
  url.searchParams.set("longitude", String(point.lon));
  url.searchParams.set("latitude", String(point.lat));
  url.searchParams.set("dataset", OPENTOPOGRAPHY_DATASET);
  url.searchParams.set("API_Key", credential);

  return requestJson(url, {}, policy).pipe(
    Effect.map((data) => {
      const elevation = (data as OpenTopographyResponse).Elevation;
      return typeof elevation === "number" && Number.isFinite(elevation)
        ? elevation
        : null;
    }),
  );
}

function estimateViaOpenTopography(
  points: ReadonlyArray<LatLon>,
  credential: string,
  policy: RequestPolicy,
): Effect.Effect<(number | null)[], GpxRequestError> {
  return Effect.forEach(
    points,
    (point) => requestOpenTopographyPoint(point, credential, policy),
    { concurrency: OPENTOPOGRAPHY_CONCURRENCY },
  );
}

function requestGoogleChunk(
  chunk: ReadonlyArray<LatLon>,
  credential: string,
  policy: RequestPolicy,
): Effect.Effect<(number | null)[], GpxRequestError> {
  return requestJson(
    GOOGLE_PROXY_ENDPOINT,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locations: chunk.map((point) => ({ lat: point.lat, lon: point.lon })),
        credential,
      }),
    },
    policy,
  ).pipe(
    Effect.flatMap((data) =>
      decodeElevations(data).pipe(
        Effect.flatMap(({ elevations }) => {
          if (!elevations || elevations.length !== chunk.length) {
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

function estimateViaGoogle(
  points: ReadonlyArray<LatLon>,
  credential: string,
  policy: RequestPolicy,
): Effect.Effect<(number | null)[], GpxRequestError> {
  const chunks: LatLon[][] = [];
  for (let start = 0; start < points.length; start += GOOGLE_CHUNK_SIZE) {
    chunks.push(points.slice(start, start + GOOGLE_CHUNK_SIZE));
  }
  return Effect.forEach(
    chunks,
    (chunk) => requestGoogleChunk(chunk, credential, policy),
    { concurrency: 1 },
  ).pipe(Effect.map((results) => results.flat()));
}

export function estimateElevationGain(
  parsed: ParsedGpx,
  provider: ElevationProvider,
  credential: string,
  policy: RequestPolicy = DEFAULT_REQUEST_POLICY,
): Effect.Effect<number, GpxRequestError> {
  const sampledSegments = buildSampleSegments(parsed);
  const flatPoints = sampledSegments.flat();

  if (flatPoints.length < 2) {
    return Effect.fail(
      new InvalidInput({
        message:
          "This file has no usable coordinates to estimate elevation from.",
      }),
    );
  }

  const fetchElevations =
    provider === "opentopography"
      ? estimateViaOpenTopography(flatPoints, credential, policy)
      : estimateViaGoogle(flatPoints, credential, policy);

  return fetchElevations.pipe(
    Effect.flatMap((elevations) => {
      let offset = 0;
      let totalGain = 0;
      let totalSamples = 0;

      for (const segment of sampledSegments) {
        const segmentElevations = elevations.slice(
          offset,
          offset + segment.length,
        );
        offset += segment.length;

        const { gain, samples } = accumulateGain(
          segment.map((_, index) => ({
            ele: segmentElevations[index] ?? undefined,
          })),
        );
        totalGain += gain;
        totalSamples += samples;
      }

      if (totalSamples < 2) {
        return Effect.fail(
          new InvalidPayload({
            message:
              "The provider returned no usable elevation data for this route.",
          }),
        );
      }
      return Effect.succeed(Math.round(totalGain));
    }),
  );
}
