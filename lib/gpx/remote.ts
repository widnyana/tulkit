import { Effect } from "effect";
import {
  type GpxRequestError,
  InvalidInput,
  ServiceUnavailable,
} from "./errors.ts";
import { type RequestPolicy, requestText } from "./http.ts";

const LOAD_FAILURE =
  "Could not load a GPX file from that link. The site may not allow it.";

export function isGpxSource(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.startsWith("/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  );
}

export function fetchGpxText(
  source: string,
  policy?: RequestPolicy,
): Effect.Effect<string, GpxRequestError> {
  const trimmed = source.trim();
  if (!isGpxSource(trimmed)) {
    return Effect.fail(
      new InvalidInput({ message: "That link is not a GPX address." }),
    );
  }
  return requestText(trimmed, {}, policy).pipe(
    Effect.mapError((error) =>
      error._tag === "InvalidInput"
        ? error
        : new ServiceUnavailable({ message: LOAD_FAILURE }),
    ),
  );
}
