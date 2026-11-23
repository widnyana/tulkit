import { Data, Effect } from "effect";
import type { GpxRequestError } from "../../lib/gpx/errors.ts";
import {
  isShortMapsLink,
  parseMapsTravelMode,
  parseMapsUrl,
} from "../../lib/gpx/mapsLink.ts";
import { isParseError, parseGpx } from "../../lib/gpx/parse.ts";
import { fetchRoadRoute } from "../../lib/gpx/routing.ts";
import type { LatLon, MapsWaypoint, ParsedGpx } from "./types";

export {
  InvalidInput,
  InvalidPayload,
  ServiceRejected,
  ServiceUnavailable,
} from "../../lib/gpx/errors.ts";

export class FileReadFailure extends Data.TaggedError("FileReadFailure")<{
  readonly message: string;
}> {}

export class GpxParseFailure extends Data.TaggedError("GpxParseFailure")<{
  readonly message: string;
}> {}

export class MapsLinkFailure extends Data.TaggedError("MapsLinkFailure")<{
  readonly message: string;
}> {}

export type GpxProgramError =
  | FileReadFailure
  | GpxParseFailure
  | MapsLinkFailure
  | GpxRequestError;

export type ProgramResult<A> =
  | { readonly ok: true; readonly value: A }
  | { readonly ok: false; readonly message: string };

export function parseGpxText(
  text: string,
): Effect.Effect<ParsedGpx, GpxParseFailure> {
  const parsed = parseGpx(text);
  return isParseError(parsed)
    ? Effect.fail(new GpxParseFailure({ message: parsed.message }))
    : Effect.succeed(parsed);
}

export function readGpxFile(
  file: File,
): Effect.Effect<
  { readonly text: string; readonly parsed: ParsedGpx },
  FileReadFailure | GpxParseFailure
> {
  return Effect.gen(function* () {
    const text = yield* Effect.tryPromise({
      try: () => file.text(),
      catch: () =>
        new FileReadFailure({ message: "Could not read that file." }),
    });
    const parsed = yield* parseGpxText(text);
    return { text, parsed };
  });
}

function resolveShortMapsLink(
  shortUrl: string,
): Effect.Effect<string, MapsLinkFailure> {
  return Effect.tryPromise({
    try: async () => {
      const response = await fetch(
        `/api/resolve-maps-link?url=${encodeURIComponent(shortUrl)}`,
      );
      const data: { resolvedUrl?: string; error?: string } =
        await response.json();
      if (!response.ok || !data.resolvedUrl) {
        throw new Error(data.error ?? "Failed to resolve the Maps link");
      }
      return data.resolvedUrl;
    },
    catch: (error) =>
      new MapsLinkFailure({
        message:
          error instanceof Error
            ? error.message
            : "Failed to resolve the Maps link",
      }),
  });
}

export interface MapsImportResult {
  readonly waypoints: MapsWaypoint[];
  readonly route: LatLon[] | null;
}

export function importMapsLink(
  rawUrl: string,
): Effect.Effect<MapsImportResult, MapsLinkFailure> {
  return Effect.gen(function* () {
    const targetUrl = isShortMapsLink(rawUrl)
      ? yield* resolveShortMapsLink(rawUrl)
      : rawUrl;
    const parsed = parseMapsUrl(targetUrl);
    if (!Array.isArray(parsed)) {
      return yield* Effect.fail(
        new MapsLinkFailure({ message: parsed.message }),
      );
    }
    const travelMode = parseMapsTravelMode(targetUrl);
    const route =
      travelMode && parsed.length >= 2
        ? yield* fetchRoadRoute(parsed, travelMode).pipe(
            Effect.catch(() => Effect.succeed(null)),
          )
        : null;
    return { waypoints: parsed, route };
  });
}

export function messageOf(error: GpxProgramError): string {
  switch (error._tag) {
    case "TimeoutError":
      return "The service took too long to answer.";
    case "ServiceRejected":
      return error.status >= 500
        ? "The service is not available right now."
        : "The service rejected the request.";
    default:
      return error.message;
  }
}

export async function runToResult<A>(
  program: Effect.Effect<A, GpxProgramError>,
): Promise<ProgramResult<A>> {
  return Effect.runPromise(
    program.pipe(
      Effect.match({
        onFailure: (error) => ({
          ok: false as const,
          message: messageOf(error),
        }),
        onSuccess: (value) => ({ ok: true as const, value }),
      }),
      Effect.catchDefect(() =>
        Effect.succeed({
          ok: false as const,
          message: "Unexpected error. Check the browser console.",
        }),
      ),
    ),
  );
}
