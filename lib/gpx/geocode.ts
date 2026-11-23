import { Effect } from "effect";
import { type GpxRequestError, InvalidPayload } from "./errors.ts";
import {
  DEFAULT_REQUEST_POLICY,
  type RequestPolicy,
  requestJson,
} from "./http.ts";

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const RESULT_LIMIT = 5;

export interface PlaceResult {
  lat: number;
  lon: number;
  label: string;
}

interface NominatimEntry {
  readonly lat?: unknown;
  readonly lon?: unknown;
  readonly display_name?: unknown;
}

function toPlaceResult(entry: NominatimEntry): PlaceResult | null {
  const lat = Number(entry.lat);
  const lon = Number(entry.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const label =
    typeof entry.display_name === "string" && entry.display_name !== ""
      ? entry.display_name
      : `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  return { lat, lon, label };
}

export function searchPlace(
  query: string,
  signal?: AbortSignal,
  policy: RequestPolicy = DEFAULT_REQUEST_POLICY,
): Effect.Effect<PlaceResult[], GpxRequestError> {
  const trimmed = query.trim();
  if (trimmed === "") return Effect.succeed([]);

  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("limit", String(RESULT_LIMIT));

  return requestJson(url, { signal }, policy).pipe(
    Effect.flatMap((data) => {
      if (!Array.isArray(data)) {
        return Effect.fail(
          new InvalidPayload({
            message: "The service returned an invalid place list.",
          }),
        );
      }

      const results: PlaceResult[] = [];
      for (const entry of data) {
        if (typeof entry !== "object" || entry === null) continue;
        const result = toPlaceResult(entry as NominatimEntry);
        if (result) results.push(result);
      }
      return Effect.succeed(results);
    }),
  );
}
